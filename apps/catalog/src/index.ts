import Fastify from "fastify"
import cors from "@fastify/cors"
import { randomUUID } from "node:crypto"
import { PrismaClient } from "./generated/prisma/index.js"
import { createLogger, TRACE_HEADER, getOrCreateTraceId } from "@quiz/observability"
import { createKafka, getProducer, startOutboxPublisher, createEnvelope, TOPICS } from "@quiz/kafka-kit"
import type { QuizChangedData, ChapterChangedData, SubjectChangedData, AiQuizGenerationRequestedData } from "@quiz/contracts"
import { createOutboxStore } from "./outbox-store.js"
import { parseJsonField, stringifyForDatabase } from "./lib/database-utils.js"
import { requireAdmin, getUserId } from "./auth.js"

const logger = createLogger("catalog-svc")
const prisma = new PrismaClient()
const PORT = Number(process.env.PORT) || 4002

interface StoredQuestion {
  id: string
  section: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  image?: string
}

function quizChangedPayload(quiz: {
  id: string
  title: string
  chapterId: string | null
  timeLimit: number
  sections: string
  questions: string
  negativeMarking: boolean
  negativeMarkValue: number
  isActive: boolean
  createdBy: string
  createdAt: Date
  version: number
}): QuizChangedData {
  const questions = parseJsonField(quiz.questions) as StoredQuestion[]
  return {
    quizId: quiz.id,
    quizVersion: quiz.version,
    title: quiz.title,
    chapterId: quiz.chapterId,
    subjectId: null, // resolved by consumers via chapterId -> DimChapter if they need it
    sectionNames: parseJsonField(quiz.sections),
    questionCount: questions.length,
    timeLimitSec: quiz.timeLimit * 60,
    negativeMarking: quiz.negativeMarking,
    negativeMarkValue: quiz.negativeMarkValue,
    isActive: quiz.isActive,
    createdBy: quiz.createdBy,
    createdAt: quiz.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

async function main() {
  const app = Fastify({ loggerInstance: logger as any })
  await app.register(cors, { origin: true })

  app.addHook("onRequest", async (request, reply) => {
    const traceId = getOrCreateTraceId(request.headers[TRACE_HEADER] as string | undefined)
    ;(request as any).traceId = traceId
    reply.header(TRACE_HEADER, traceId)
  })

  app.get("/healthz", async () => ({ status: "ok" }))
  app.get("/readyz", async (_request, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`
      return { status: "ready" }
    } catch (err) {
      reply.code(503)
      return { status: "not ready", error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ---------------------------------------------------------------- subjects
  app.get("/v1/subjects", async () => {
    const subjects = await prisma.subject.findMany({
      include: { chapters: { include: { _count: { select: { quizzes: true } } } } },
    })
    return subjects.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description || "",
      icon: s.icon || "",
      color: s.color || "#3B82F6",
      chapterCount: s.chapters.length,
      quizCount: s.chapters.reduce((total, c) => total + c._count.quizzes, 0),
      chapters: s.chapters.map((c) => ({ id: c.id, name: c.name, description: c.description || "", subjectId: c.subjectId, quizCount: c._count.quizzes })),
    }))
  })

  app.get("/v1/subjects/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const subject = await prisma.subject.findUnique({ where: { id } })
    if (!subject) {
      reply.code(404)
      return { message: "Subject not found" }
    }
    return subject
  })

  app.get("/v1/subjects/:id/chapters", async (request) => {
    const { id } = request.params as { id: string }
    const chapters = await prisma.chapter.findMany({
      where: { subjectId: id },
      include: { _count: { select: { questions: true, quizzes: true } } },
      orderBy: { name: "asc" },
    })
    return chapters.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description || "",
      quizCount: c._count.quizzes,
      questionCount: c._count.questions,
    }))
  })

  // ------------------------------------------------------------------ chapters
  app.get("/v1/chapters/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const chapter = await prisma.chapter.findUnique({ where: { id }, include: { subject: true } })
    if (!chapter) {
      reply.code(404)
      return { message: "Chapter not found" }
    }
    return chapter
  })

  app.get("/v1/chapters/:id/quizzes", async (request) => {
    const { id } = request.params as { id: string }
    const quizzes = await prisma.quiz.findMany({ where: { chapterId: id, isActive: true }, orderBy: { createdAt: "asc" } })
    return quizzes.map((quiz) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questionCount: parseJsonField(quiz.questions).length,
      timeLimit: quiz.timeLimit,
    }))
  })

  // -------------------------------------------------------------------- quizzes (public, metadata only)
  app.get("/v1/quizzes", async () => {
    const quizzes = await prisma.quiz.findMany({ where: { isActive: true } })
    return quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      timeLimitSec: q.timeLimit * 60,
      sectionNames: parseJsonField(q.sections),
      questionCount: parseJsonField(q.questions).length,
      isActive: q.isActive,
      negativeMarking: q.negativeMarking,
      negativeMarkValue: q.negativeMarkValue,
      chapterId: q.chapterId,
    }))
  })

  app.get("/v1/quizzes/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const quiz = await prisma.quiz.findUnique({ where: { id } })
    if (!quiz) {
      reply.code(404)
      return { message: "Quiz not found" }
    }
    // Metadata only -- correctAnswer never leaves this service via this route.
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      timeLimitSec: quiz.timeLimit * 60,
      sectionNames: parseJsonField(quiz.sections),
      questionCount: parseJsonField(quiz.questions).length,
      isActive: quiz.isActive,
      negativeMarking: quiz.negativeMarking,
      negativeMarkValue: quiz.negativeMarkValue,
      chapterId: quiz.chapterId,
    }
  })

  // ---------------------------------------------------------- internal (answer keys)
  // Never routed publicly through the gateway -- only assessment-svc calls this,
  // once, at attempt-start time. See ARCHITECTURE.md's data-ownership mechanism (a).
  app.get("/internal/quizzes/:id/full", async (request, reply) => {
    const { id } = request.params as { id: string }
    const quiz = await prisma.quiz.findUnique({ where: { id } })
    if (!quiz) {
      reply.code(404)
      return { message: "Quiz not found" }
    }
    return {
      id: quiz.id,
      title: quiz.title,
      version: quiz.version,
      isActive: quiz.isActive,
      timeLimitSec: quiz.timeLimit * 60,
      negativeMarking: quiz.negativeMarking,
      negativeMarkValue: quiz.negativeMarkValue,
      sections: parseJsonField(quiz.sections),
      questions: parseJsonField(quiz.questions),
    }
  })

  // Bulk quiz/chapter/subject metadata for assessment-svc's legacy (pre-Attempt
  // QuizResult) admin/analytics reporting routes -- those predate the service
  // split and used to get this via a single Prisma include chain; this is the
  // cross-service equivalent. Internal only, never gateway-routed. No answer
  // keys here, just names -- safe to fetch in full at this data scale.
  app.get("/internal/quizzes-meta", async () => {
    const quizzes = await prisma.quiz.findMany({
      select: {
        id: true,
        title: true,
        questions: true,
        isActive: true,
        createdAt: true,
        chapterId: true,
        chapter: { select: { name: true, subjectId: true, subject: { select: { name: true, icon: true, color: true } } } },
      },
    })
    return quizzes.map((q) => ({
      id: q.id,
      title: q.title,
      questionCount: parseJsonField(q.questions).length,
      isActive: q.isActive,
      createdAt: q.createdAt,
      chapterId: q.chapterId,
      chapterName: q.chapter?.name ?? null,
      subjectId: q.chapter?.subjectId ?? null,
      subjectName: q.chapter?.subject?.name ?? null,
      subjectIcon: q.chapter?.subject?.icon ?? null,
      subjectColor: q.chapter?.subject?.color ?? null,
    }))
  })

  // ------------------------------------------------------------------- admin: subjects
  app.post("/v1/admin/subjects", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { name, description, icon, color } = (request.body as any) ?? {}
    if (!name) {
      reply.code(400)
      return { message: "Subject name is required" }
    }
    const existing = await prisma.subject.findFirst({ where: { name } })
    if (existing) {
      reply.code(409)
      return { message: "Subject already exists" }
    }
    const subject = await prisma.subject.create({
      data: { name, description: description || "", icon: icon || "📚", color: color || "#3B82F6" },
    })
    await publishChange(TOPICS.SUBJECT_CHANGED, subject.id, { subjectId: subject.id, name: subject.name } satisfies SubjectChangedData)
    return { subject }
  })

  app.put("/v1/admin/subjects/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const { name, description, icon, color } = (request.body as any) ?? {}
    const subject = await prisma.subject.update({
      where: { id },
      data: { ...(name && { name }), ...(description !== undefined && { description }), ...(icon !== undefined && { icon }), ...(color !== undefined && { color }) },
    })
    await publishChange(TOPICS.SUBJECT_CHANGED, subject.id, { subjectId: subject.id, name: subject.name } satisfies SubjectChangedData)
    return { subject }
  })

  app.delete("/v1/admin/subjects/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const subject = await prisma.subject.findUnique({ where: { id }, include: { chapters: { include: { quizzes: true } } } })
    if (!subject) {
      reply.code(404)
      return { message: "Subject not found" }
    }
    if (subject.chapters.some((c) => c.quizzes.length > 0)) {
      reply.code(409)
      return { message: "Cannot delete subject that has chapters with quizzes. Please move or delete quizzes first." }
    }
    await prisma.chapter.deleteMany({ where: { subjectId: id } })
    await prisma.subject.delete({ where: { id } })
    return { message: "Subject deleted successfully" }
  })

  // ------------------------------------------------------------------- admin: chapters
  app.post("/v1/admin/chapters", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { name, description, subjectId } = (request.body as any) ?? {}
    if (!name || !subjectId) {
      reply.code(400)
      return { message: "Chapter name and subject ID are required" }
    }
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } })
    if (!subject) {
      reply.code(404)
      return { message: "Subject not found" }
    }
    const existing = await prisma.chapter.findFirst({ where: { name, subjectId } })
    if (existing) {
      reply.code(409)
      return { message: "Chapter already exists in this subject" }
    }
    const chapter = await prisma.chapter.create({ data: { name, description: description || "", subjectId } })
    await publishChange(TOPICS.CHAPTER_CHANGED, chapter.id, { chapterId: chapter.id, subjectId: chapter.subjectId, name: chapter.name } satisfies ChapterChangedData)
    return { chapter }
  })

  app.put("/v1/admin/chapters/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const { name, description } = (request.body as any) ?? {}
    const chapter = await prisma.chapter.update({ where: { id }, data: { ...(name && { name }), ...(description !== undefined && { description }) } })
    await publishChange(TOPICS.CHAPTER_CHANGED, chapter.id, { chapterId: chapter.id, subjectId: chapter.subjectId, name: chapter.name } satisfies ChapterChangedData)
    return { chapter }
  })

  app.delete("/v1/admin/chapters/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const chapter = await prisma.chapter.findUnique({ where: { id }, include: { quizzes: true } })
    if (!chapter) {
      reply.code(404)
      return { message: "Chapter not found" }
    }
    if (chapter.quizzes.length > 0) {
      reply.code(409)
      return { message: "Cannot delete chapter that has quizzes. Please move or delete quizzes first." }
    }
    await prisma.chapter.delete({ where: { id } })
    return { message: "Chapter deleted successfully" }
  })

  // --------------------------------------------------------------------- admin: quizzes
  app.get("/v1/admin/quizzes", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const quizzes = await prisma.quiz.findMany()
    return {
      quizzes: quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.timeLimit,
        chapterId: quiz.chapterId,
        sections: parseJsonField(quiz.sections),
        questions: parseJsonField(quiz.questions),
        isActive: quiz.isActive,
        createdAt: quiz.createdAt.toISOString(),
        createdBy: quiz.createdBy,
        negativeMarking: quiz.negativeMarking,
        negativeMarkValue: quiz.negativeMarkValue,
        version: quiz.version,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
        // attempts/avgScore/avgTime removed -- that's analytics-svc's job now
        // (quiz_stats), not a join across services. See ARCHITECTURE.md.
      })),
    }
  })

  app.post("/v1/admin/quizzes", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const body = (request.body as any) ?? {}
    const { title, description, duration, subjectId, chapterId, sections, questions, negativeMarking, negativeMarkValue } = body

    const errors: Array<{ field: string; message: string }> = []
    if (!title || typeof title !== "string" || title.trim().length < 3 || title.trim().length > 200) {
      errors.push({ field: "title", message: "Quiz title must be 3-200 characters" })
    }
    if (typeof duration !== "number" || isNaN(duration) || duration < 5 || duration > 300) {
      errors.push({ field: "duration", message: "Quiz duration must be a number between 5 and 300 minutes" })
    }
    if (!chapterId || (typeof chapterId === "string" && chapterId.trim() === "")) {
      errors.push({ field: "chapterId", message: "Chapter selection is required" })
    }
    if (!sections || !Array.isArray(sections) || sections.length === 0) {
      errors.push({ field: "sections", message: "At least one section is required" })
    }
    if (negativeMarking === true) {
      if (typeof negativeMarkValue !== "number" || isNaN(negativeMarkValue) || negativeMarkValue < 0.1 || negativeMarkValue > 1.0) {
        errors.push({ field: "negativeMarkValue", message: "Negative marking value must be between 0.1 and 1.0" })
      }
    }
    if (questions && !Array.isArray(questions)) {
      errors.push({ field: "questions", message: "Questions must be an array" })
    }
    if (errors.length > 0) {
      reply.code(400)
      return { message: "Validation failed", errors }
    }

    if (chapterId && subjectId) {
      const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } })
      if (!chapter) {
        reply.code(404)
        return { message: `Chapter with ID "${chapterId}" does not exist` }
      }
      if (chapter.subjectId !== subjectId) {
        reply.code(400)
        return { message: "Chapter does not belong to selected subject" }
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const quiz = await tx.quiz.create({
        data: {
          title,
          description: description || "",
          timeLimit: duration,
          chapterId,
          sections: stringifyForDatabase(sections),
          questions: stringifyForDatabase(questions || []),
          isActive: true,
          createdBy: getUserId(request) || "admin",
          negativeMarking: negativeMarking ?? true,
          negativeMarkValue: negativeMarkValue ?? 0.25,
        },
      })
      await tx.outbox.create({
        data: {
          aggregateType: "Quiz",
          aggregateId: quiz.id,
          topic: TOPICS.QUIZ_CHANGED,
          key: quiz.id,
          payload: createEnvelope(TOPICS.QUIZ_CHANGED, quizChangedPayload(quiz), { producer: "catalog-svc" }) as any,
          headers: { "content-type": "application/json", "event-type": TOPICS.QUIZ_CHANGED },
        },
      })
      return quiz
    })

    return { quiz: { ...created, questions: parseJsonField(created.questions), sections: parseJsonField(created.sections) } }
  })

  app.get("/v1/admin/quizzes/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const quiz = await prisma.quiz.findUnique({ where: { id } })
    if (!quiz) {
      reply.code(404)
      return { message: "Quiz not found" }
    }
    return { quiz: { ...quiz, questions: parseJsonField(quiz.questions), sections: parseJsonField(quiz.sections) } }
  })

  // Optimistic-concurrency PATCH: the client must send back the `version` it
  // last read. UPDATE ... WHERE id = $1 AND version = $2; 0 rows affected =
  // someone else edited first = 409. Fixes a real silent-data-loss bug in the
  // old monolith, where two admins editing the same quiz via the whole-blob
  // PATCH just clobbered each other with last-write-wins.
  app.patch("/v1/admin/quizzes/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const body = (request.body as any) ?? {}
    const { version: expectedVersion, ...updates } = body
    if (typeof expectedVersion !== "number") {
      reply.code(400)
      return { message: "version is required (send back the version you last read)" }
    }

    const data: Record<string, unknown> = { version: { increment: 1 } }
    if (updates.title !== undefined) data.title = updates.title
    if (updates.description !== undefined) data.description = updates.description
    if (updates.duration !== undefined) data.timeLimit = updates.duration
    if (updates.sections !== undefined) data.sections = stringifyForDatabase(updates.sections)
    if (updates.questions !== undefined) data.questions = stringifyForDatabase(updates.questions)
    if (updates.isActive !== undefined) data.isActive = updates.isActive
    if (updates.negativeMarking !== undefined) data.negativeMarking = updates.negativeMarking
    if (updates.negativeMarkValue !== undefined) data.negativeMarkValue = updates.negativeMarkValue
    if (updates.chapterId && updates.chapterId !== "none" && String(updates.chapterId).trim() !== "") data.chapterId = updates.chapterId

    const result = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.quiz.updateMany({ where: { id, version: expectedVersion }, data })
      if (updateResult.count === 0) return null
      const quiz = await tx.quiz.findUniqueOrThrow({ where: { id } })
      await tx.outbox.create({
        data: {
          aggregateType: "Quiz",
          aggregateId: quiz.id,
          topic: TOPICS.QUIZ_CHANGED,
          key: quiz.id,
          payload: createEnvelope(TOPICS.QUIZ_CHANGED, quizChangedPayload(quiz), { producer: "catalog-svc" }) as any,
          headers: { "content-type": "application/json", "event-type": TOPICS.QUIZ_CHANGED },
        },
      })
      return quiz
    })

    if (!result) {
      reply.code(409)
      return { message: "This quiz was modified by someone else. Reload and try again." }
    }
    return { quiz: { ...result, questions: parseJsonField(result.questions), sections: parseJsonField(result.sections) } }
  })

  app.delete("/v1/admin/quizzes/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    await prisma.quiz.delete({ where: { id } })
    return { message: "Quiz deleted" }
  })

  app.get("/v1/admin/subjects-chapters-quizzes", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const subjects = await prisma.subject.findMany({ include: { chapters: { include: { quizzes: true } } } })
    return {
      subjects: subjects.map((s) => ({
        id: s.id,
        name: s.name,
        chapters: s.chapters.map((c) => ({
          id: c.id,
          name: c.name,
          quizzes: c.quizzes.map((q) => ({ id: q.id, title: q.title, questionCount: parseJsonField(q.questions).length })),
        })),
      })),
    }
  })

  // -------------------------------------------------------------- admin: question bank
  app.get("/v1/admin/question-bank", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const q = request.query as Record<string, string | undefined>
    const page = parseInt(q.page || "1")
    const limit = parseInt(q.limit || "20")
    const where: Record<string, unknown> = {}
    if (q.section) where.section = q.section
    if (q.difficulty) where.difficulty = q.difficulty
    if (q.tag) where.tags = { contains: q.tag }
    if (q.search) where.OR = [{ question: { contains: q.search, mode: "insensitive" } }, { explanation: { contains: q.search, mode: "insensitive" } }]

    const total = await prisma.questionBankItem.count({ where })
    const questions = await prisma.questionBankItem.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit })
    return {
      questions: questions.map((item) => ({ ...item, options: parseJsonField(item.options), tags: parseJsonField(item.tags) })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  })

  app.post("/v1/admin/question-bank", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { section, question, options, correctAnswer, explanation, difficulty, tags, image, source } = (request.body as any) ?? {}
    if (!section || !question || !options || options.length !== 4 || typeof correctAnswer !== "number" || correctAnswer < 0 || correctAnswer > 3) {
      reply.code(400)
      return { message: "Missing or invalid required fields" }
    }
    const item = await prisma.questionBankItem.create({
      data: {
        section,
        question: question.trim(),
        options: stringifyForDatabase(options),
        correctAnswer,
        explanation: explanation?.trim() || "",
        difficulty: difficulty || "medium",
        tags: stringifyForDatabase(tags || []),
        image: image || "",
        source: source || "",
      },
    })
    return { question: { ...item, options: parseJsonField(item.options), tags: parseJsonField(item.tags) } }
  })

  app.get("/v1/admin/question-bank/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const item = await prisma.questionBankItem.findUnique({ where: { id } })
    if (!item) {
      reply.code(404)
      return { message: "Question not found" }
    }
    return { question: { ...item, options: parseJsonField(item.options), tags: parseJsonField(item.tags) } }
  })

  app.put("/v1/admin/question-bank/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const body = (request.body as any) ?? {}
    const data: Record<string, unknown> = {}
    for (const field of ["section", "question", "correctAnswer", "explanation", "difficulty", "image", "source", "isVerified"]) {
      if (body[field] !== undefined) data[field] = body[field]
    }
    if (body.options !== undefined) data.options = stringifyForDatabase(body.options)
    if (body.tags !== undefined) data.tags = stringifyForDatabase(body.tags)
    const item = await prisma.questionBankItem.update({ where: { id }, data })
    return { question: { ...item, options: parseJsonField(item.options), tags: parseJsonField(item.tags) } }
  })

  app.delete("/v1/admin/question-bank/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    await prisma.questionBankItem.delete({ where: { id } })
    return { message: "Question deleted" }
  })

  // --------------------------------------------------------------------------- AI
  app.post("/v1/ai/quiz-generations", async (request, reply) => {
    const userId = getUserId(request)
    if (!userId) {
      reply.code(401)
      return { message: "Unauthorized" }
    }
    const { title, sections, difficulty, questionsPerSection } = (request.body as any) ?? {}
    if (!title || !Array.isArray(sections) || sections.length === 0) {
      reply.code(400)
      return { message: "title and a non-empty sections array are required" }
    }

    const job = await prisma.aiGenerationJob.create({
      data: {
        requestedBy: userId,
        title,
        sections: JSON.stringify(sections),
        difficulty: difficulty || "medium",
        questionsPerSection: questionsPerSection || 10,
        status: "pending",
      },
    })

    try {
      const payload: AiQuizGenerationRequestedData = {
        jobId: job.id,
        requestedBy: userId,
        title,
        sections,
        difficulty: difficulty || "medium",
        questionsPerSection: questionsPerSection || 10,
      }
      const envelope = createEnvelope(TOPICS.AI_QUIZ_GENERATION_REQUESTED, payload, {
        producer: "catalog-svc",
        traceId: (request as any).traceId,
      })
      await producer.send({ topic: TOPICS.AI_QUIZ_GENERATION_REQUESTED, messages: [{ key: job.id, value: JSON.stringify(envelope) }] })
    } catch (err) {
      logger.error(err, "failed to publish quiz-generation-requested")
      reply.code(503)
      return { message: "Failed to queue generation job" }
    }

    reply.code(202)
    return { jobId: job.id }
  })

  app.get("/v1/ai/quiz-generations/:jobId", async (request, reply) => {
    const { jobId } = request.params as { jobId: string }
    const job = await prisma.aiGenerationJob.findUnique({ where: { id: jobId } })
    if (!job) {
      reply.code(404)
      return { message: "Job not found" }
    }
    return job
  })

  const kafkaClient = createKafka("catalog-svc")
  const producer = await getProducer(kafkaClient)
  const stopOutbox = startOutboxPublisher(producer, createOutboxStore(prisma))

  async function publishChange(topic: string, key: string, data: unknown) {
    await producer.send({
      topic,
      messages: [{ key, value: JSON.stringify(createEnvelope(topic, data, { producer: "catalog-svc" })) }],
    })
  }

  const close = async () => {
    stopOutbox()
    await producer.disconnect()
    await prisma.$disconnect()
    await app.close()
    process.exit(0)
  }
  process.on("SIGTERM", close)
  process.on("SIGINT", close)

  await app.listen({ port: PORT, host: "0.0.0.0" })
  logger.info(`catalog-svc listening on :${PORT}`)
}

main().catch((err) => {
  logger.error(err, "catalog-svc failed to start")
  process.exit(1)
})
