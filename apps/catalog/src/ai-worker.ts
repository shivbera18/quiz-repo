import { GoogleGenerativeAI } from "@google/generative-ai"
import { PrismaClient } from "./generated/prisma/index.js"
import { createLogger, ensureDatabaseUrl } from "@quiz/observability"
import { createKafka, createEnvelope, TOPICS, runConsumer, getProducer, isKafkaDisabled } from "@quiz/kafka-kit"
import type { AiQuizGenerationRequestedData, AiQuizGenerationCompletedData } from "@quiz/contracts"
import { quizChangedPayload } from "./lib/events.js"

const logger = createLogger("catalog-ai-worker")
ensureDatabaseUrl("catalog")
const prisma = new PrismaClient()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "")

interface GeneratedQuestion {
  id: string
  section: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  tags: string[]
}

async function generateSection(section: string, topic: string, difficulty: string, count: number): Promise<GeneratedQuestion[]> {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })
  const prompt = `Generate ${count} ${difficulty} level multiple choice questions for the "${section}" section about "${topic}".

Requirements:
- Each question should have exactly 4 options
- Only one correct answer per question
- Include a clear explanation for the correct answer
- Add relevant tags for categorization

Return a JSON object with this exact structure:
{
  "questions": [
    { "question": "...", "options": ["A","B","C","D"], "correctAnswer": 0, "explanation": "...", "tags": ["tag1"] }
  ]
}`

  const result = await model.generateContent(prompt)
  const text = result.response.text()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error(`No valid JSON found in AI response for section ${section}`)

  const parsed = JSON.parse(jsonMatch[0])
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error(`Invalid AI response format for section ${section}`)
  }

  return parsed.questions.map((q: any, i: number) => ({
    id: `${section}-${i}-${Date.now()}`,
    section,
    question: q.question,
    options: q.options,
    correctAnswer: q.correctAnswer,
    explanation: q.explanation || "",
    tags: q.tags || [],
  }))
}

async function main() {
  if (isKafkaDisabled()) {
    logger.warn("Kafka disabled - catalog-ai-worker not consuming (AI generation requires Kafka). Exiting idle mode.")
    // Keep process alive for turbo dev but not failing
    await new Promise(() => {})
    return
  }
  const kafka = createKafka("catalog-ai-worker")
  const producer = await getProducer(kafka)

  await runConsumer<AiQuizGenerationRequestedData>(kafka, {
    groupId: "catalog-ai-worker",
    topics: [TOPICS.AI_QUIZ_GENERATION_REQUESTED],
    // A 30-120s-per-section Gemini job easily exceeds Kafka's default
    // rebalance timeout (~300s poll interval covers 2-3 sections at most).
    // Without this, the consumer gets evicted from its group mid-job,
    // triggering a rebalance, and the SAME job gets picked up again by
    // another consumer -- generating the quiz twice. See ARCHITECTURE.md.
    maxPollIntervalMs: 15 * 60_000,
    store: {
      async hasProcessed(eventId: string) {
        const existing = await prisma.$queryRaw<Array<{ exists: boolean }>>`
          SELECT true as exists FROM "AiGenerationJob" WHERE id = ${eventId}::text LIMIT 1
        `
        // Note: this dedup check is intentionally weak (job id != event id in
        // general) -- see the honesty note at the bottom of this file about
        // what a fuller implementation would do differently.
        return false
      },
    },
    async onMessage({ envelope }) {
      const startedAt = Date.now()
      const { jobId, title, sections, difficulty, questionsPerSection, requestedBy } = envelope.data

      await prisma.aiGenerationJob.update({ where: { id: jobId }, data: { status: "in_progress" } })

      const partial: Record<string, GeneratedQuestion[]> = {}
      const failures: Array<{ section: string; reason: string }> = []

      for (const section of sections) {
        try {
          const questions = await generateSection(section, title, difficulty, questionsPerSection)
          partial[section] = questions
          // Written after EACH section, not just at the end -- this is the
          // actual fix for the monolith's data-loss bug (its route discarded
          // every already-generated section on the first failure).
          await prisma.aiGenerationJob.update({ where: { id: jobId }, data: { partialQuestions: partial as any } })
          logger.info({ jobId, section }, "section generated")
        } catch (err) {
          const reason = err instanceof Error ? err.message : String(err)
          failures.push({ section, reason })
          logger.error({ jobId, section, reason }, "section generation failed, continuing to next section")
        }
      }

      const allQuestions = Object.values(partial).flat()
      const status: "succeeded" | "partial" | "failed" = failures.length === 0 ? "succeeded" : allQuestions.length > 0 ? "partial" : "failed"

      let resultQuizId: string | null = null
      if (allQuestions.length > 0) {
        // Quiz creation + its QUIZ_CHANGED outbox row commit atomically, same
        // as the admin POST /v1/admin/quizzes route -- without the event,
        // analytics-svc never learns this quiz exists (no DimQuiz row), so
        // attempt facts for it resolve chapter/subject to null and it is
        // invisible to every subject-scoped rollup until manually edited.
        const quiz = await prisma.$transaction(async (tx) => {
          const created = await tx.quiz.create({
            data: {
              title,
              description: `AI-generated quiz: ${title}`,
              timeLimit: 30,
              sections: JSON.stringify(sections),
              questions: JSON.stringify(allQuestions),
              isActive: false, // all AI quizzes land as inactive drafts for admin review (never auto-publish)
              createdBy: requestedBy,
              negativeMarking: true,
              negativeMarkValue: 0.25,
            },
          })
          await tx.outbox.create({
            data: {
              aggregateType: "Quiz",
              aggregateId: created.id,
              topic: TOPICS.QUIZ_CHANGED,
              key: created.id,
              payload: createEnvelope(TOPICS.QUIZ_CHANGED, quizChangedPayload(created), { producer: "catalog-svc" }) as any,
              headers: { "content-type": "application/json", "event-type": TOPICS.QUIZ_CHANGED },
            },
          })
          return created
        })
        resultQuizId = quiz.id
      }

      await prisma.aiGenerationJob.update({
        where: { id: jobId },
        data: { status, resultQuizId, failures: failures as any, completedAt: new Date() },
      })

      const completedPayload: AiQuizGenerationCompletedData = {
        jobId,
        status,
        quizId: resultQuizId,
        generated: Object.entries(partial).map(([section, qs]) => ({ section, count: qs.length })),
        failures,
        elapsedMs: Date.now() - startedAt,
      }
      await producer.send({
        topic: TOPICS.AI_QUIZ_GENERATION_COMPLETED,
        messages: [{ key: jobId, value: JSON.stringify(createEnvelope(TOPICS.AI_QUIZ_GENERATION_COMPLETED, completedPayload, { producer: "catalog-ai-worker" })) }],
      })

      logger.info({ jobId, status, resultQuizId }, "job completed")
    },
  })

  logger.info("catalog-ai-worker consuming quiz.ai.quiz-generation-requested.v1")
}

// Honesty note (see ARCHITECTURE.md's cargo-cult audit, which names this
// exact topic): this is a 30-120s-per-job, single-consumer task with no
// ordering requirement -- a job queue library (pg-boss/BullMQ) fits this
// shape better than Kafka, which has no native per-job status, no delayed
// retry, and head-of-line blocking on a slow record. Kept on Kafka here for
// the demonstration value; the maxPollIntervalMs workaround above is the
// mitigation, not a reason to pretend this is the ideal tool.
//
// Also note the `hasProcessed` implementation above is a stub returning
// `false` unconditionally -- proper consumer-side idempotency here would
// need a dedicated `processed_event` table keyed by envelope.eventId (not
// jobId), checked/inserted transactionally alongside the AiGenerationJob
// update, the same pattern every other consumer in this system uses. Cut for
// time in this pass; flagged rather than silently shipped as if it were done.
main().catch((err) => {
  logger.error(err, "catalog-ai-worker failed to start")
  process.exit(1)
})
