import Fastify from "fastify"
import cors from "@fastify/cors"
import { randomUUID } from "node:crypto"
import { PrismaClient, Prisma, type Quiz } from "./generated/prisma/index.js"
import { createLogger, TRACE_HEADER, getOrCreateTraceId, ensureDatabaseUrl } from "@quiz/observability"
import { createKafka, getProducer, startOutboxPublisher, createEnvelope, TOPICS, isKafkaDisabled } from "@quiz/kafka-kit"
import type { QuizChangedData, ChapterChangedData, SubjectChangedData, AiQuizGenerationRequestedData } from "@quiz/contracts"
import { createOutboxStore } from "./outbox-store.js"
import { parseJsonField, stringifyForDatabase } from "./lib/database-utils.js"
import { quizChangedPayload } from "./lib/events.js"
import { handleCatalogError } from "./lib/errors.js"
import type { StoredQuestion } from "./types.js"
import { requireAdmin, getUserId } from "./auth.js"
import {
  subjectCreateSchema,
  subjectUpdateSchema,
  chapterCreateSchema,
  chapterUpdateSchema,
  quizCreateSchema,
  quizPatchSchema,
  questionBankCreateSchema,
  questionBankUpdateSchema,
  questionBankListQuerySchema,
  computeSchedulingStatus,
} from "@quiz/contracts"
import type { z } from "zod"

const logger = createLogger("catalog-svc")
ensureDatabaseUrl("catalog")
const prisma = new PrismaClient()
const PORT = Number(process.env.PORT) || 4002

// Same response shape the hand-rolled validation returned, so existing admin
// clients (which branch on status code) keep working while gaining
// field-level detail.
function validationFailed(error: z.ZodError) {
  return {
    message: "Validation failed" as const,
    errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
  }
}

// A tombstone row: Kafka null-value record keyed by the deleted entity's id,
// emitted on the entity's compacted change topic in the SAME transaction as
// the delete itself. Compaction eventually removes the key entirely; until
// then, consumers skip null payloads and rebuilds no longer resurrect
// deleted entities from their original create event.
function tombstoneOutboxRow(entity: "Subject" | "Chapter" | "Quiz", id: string) {
  const topic = entity === "Subject" ? TOPICS.SUBJECT_CHANGED : entity === "Chapter" ? TOPICS.CHAPTER_CHANGED : TOPICS.QUIZ_CHANGED
  return {
    aggregateType: entity,
    aggregateId: id,
    topic,
    key: id,
    payload: Prisma.DbNull,
    headers: { "content-type": "application/json", "event-type": topic },
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
      startTime: quiz.startTime?.toISOString() ?? null,
      endTime: quiz.endTime?.toISOString() ?? null,
      schedulingStatus: computeSchedulingStatus(quiz.startTime, quiz.endTime),
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
      startTime: q.startTime?.toISOString() ?? null,
      endTime: q.endTime?.toISOString() ?? null,
      schedulingStatus: computeSchedulingStatus(q.startTime, q.endTime),
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
      startTime: quiz.startTime?.toISOString() ?? null,
      endTime: quiz.endTime?.toISOString() ?? null,
      schedulingStatus: computeSchedulingStatus(quiz.startTime, quiz.endTime),
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
      // Assessment-svc enforces the schedule window at attempt-START only;
      // an attempt that began inside the window always finishes.
      startTime: quiz.startTime?.toISOString() ?? null,
      endTime: quiz.endTime?.toISOString() ?? null,
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
    const parsed = subjectCreateSchema.safeParse((request.body as any) ?? {})
    if (!parsed.success) {
      reply.code(400)
      return validationFailed(parsed.error)
    }
    const { name, description, icon, color } = parsed.data
    const existing = await prisma.subject.findFirst({ where: { name } })
    if (existing) {
      reply.code(409)
      return { message: "Subject already exists" }
    }
    try {
      const subject = await prisma.subject.create({
        data: { name, description: description || "", icon: icon || "📚", color: color || "#3B82F6" },
      })
      await publishChange(TOPICS.SUBJECT_CHANGED, subject.id, { subjectId: subject.id, name: subject.name } satisfies SubjectChangedData)
      return { subject }
    } catch (err) {
      return handleCatalogError(err, reply)
    }
  })

  app.put("/v1/admin/subjects/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const parsed = subjectUpdateSchema.safeParse((request.body as any) ?? {})
    if (!parsed.success) {
      reply.code(400)
      return validationFailed(parsed.error)
    }
    const { name, description, icon, color } = parsed.data
    try {
      const subject = await prisma.subject.update({
        where: { id },
        data: { ...(name && { name }), ...(description !== undefined && { description }), ...(icon !== undefined && { icon }), ...(color !== undefined && { color }) },
      })
      await publishChange(TOPICS.SUBJECT_CHANGED, subject.id, { subjectId: subject.id, name: subject.name } satisfies SubjectChangedData)
      return { subject }
    } catch (err) {
      return handleCatalogError(err, reply)
    }
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
    // Delete + tombstones commit atomically: one outbox row per deleted
    // chapter plus the subject's own, so replay-from-zero cannot resurrect
    // any of them on the compacted topics.
    try {
      await prisma.$transaction(async (tx) => {
        await tx.chapter.deleteMany({ where: { subjectId: id } })
        for (const chapter of subject.chapters) {
          await tx.outbox.create({ data: tombstoneOutboxRow("Chapter", chapter.id) })
        }
        await tx.subject.delete({ where: { id } })
        await tx.outbox.create({ data: tombstoneOutboxRow("Subject", id) })
      })
    } catch (err) {
      return handleCatalogError(err, reply)
    }
    return { message: "Subject deleted successfully" }
  })

  // ------------------------------------------------------------------- admin: chapters
  app.post("/v1/admin/chapters", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const parsed = chapterCreateSchema.safeParse((request.body as any) ?? {})
    if (!parsed.success) {
      reply.code(400)
      return validationFailed(parsed.error)
    }
    const { name, description, subjectId } = parsed.data
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
    try {
      const chapter = await prisma.chapter.create({ data: { name, description: description || "", subjectId } })
      await publishChange(TOPICS.CHAPTER_CHANGED, chapter.id, { chapterId: chapter.id, subjectId: chapter.subjectId, name: chapter.name } satisfies ChapterChangedData)
      return { chapter }
    } catch (err) {
      return handleCatalogError(err, reply)
    }
  })

  app.put("/v1/admin/chapters/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const parsed = chapterUpdateSchema.safeParse((request.body as any) ?? {})
    if (!parsed.success) {
      reply.code(400)
      return validationFailed(parsed.error)
    }
    const { name, description } = parsed.data
    try {
      const chapter = await prisma.chapter.update({ where: { id }, data: { ...(name && { name }), ...(description !== undefined && { description }) } })
      await publishChange(TOPICS.CHAPTER_CHANGED, chapter.id, { chapterId: chapter.id, subjectId: chapter.subjectId, name: chapter.name } satisfies ChapterChangedData)
      return { chapter }
    } catch (err) {
      return handleCatalogError(err, reply)
    }
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
    try {
      await prisma.$transaction(async (tx) => {
        await tx.chapter.delete({ where: { id } })
        await tx.outbox.create({ data: tombstoneOutboxRow("Chapter", id) })
      })
    } catch (err) {
      return handleCatalogError(err, reply)
    }
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
    const parsed = quizCreateSchema.safeParse((request.body as any) ?? {})
    if (!parsed.success) {
      reply.code(400)
      return validationFailed(parsed.error)
    }
    const { title, description, duration, subjectId, chapterId, sections, questions, negativeMarking, negativeMarkValue } = parsed.data

    // Chapter existence is checked UNCONDITIONALLY -- the previous code only
    // verified it when a subjectId was also present, so a bogus chapterId
    // sailed through validation and died as an unhandled FK error.
    const chapter = await prisma.chapter.findUnique({ where: { id: chapterId } })
    if (!chapter) {
      reply.code(404)
      return { message: `Chapter with ID "${chapterId}" does not exist` }
    }
    if (subjectId && chapter.subjectId !== subjectId) {
      reply.code(400)
      return { message: "Chapter does not belong to selected subject" }
    }

    try {
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
            startTime: parsed.data.startTime ? new Date(parsed.data.startTime) : null,
            endTime: parsed.data.endTime ? new Date(parsed.data.endTime) : null,
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
    } catch (err) {
      return handleCatalogError(err, reply)
    }
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
    const parsed = quizPatchSchema.safeParse((request.body as any) ?? {})
    if (!parsed.success) {
      reply.code(400)
      return validationFailed(parsed.error)
    }
    const updates = parsed.data

    const data: Record<string, unknown> = { version: { increment: 1 } }
    if (updates.title !== undefined) data.title = updates.title
    if (updates.description !== undefined) data.description = updates.description
    if (updates.duration !== undefined) data.timeLimit = updates.duration
    if (updates.sections !== undefined) data.sections = stringifyForDatabase(updates.sections)
    if (updates.questions !== undefined) data.questions = stringifyForDatabase(updates.questions)
    if (updates.isActive !== undefined) data.isActive = updates.isActive
    if (updates.negativeMarking !== undefined) data.negativeMarking = updates.negativeMarking
    if (updates.negativeMarkValue !== undefined) data.negativeMarkValue = updates.negativeMarkValue
    // "none"/""/null keep their historical PATCH semantics (chapter unchanged);
    // only a real id re-points the quiz.
    if (updates.chapterId && updates.chapterId !== "none" && String(updates.chapterId).trim() !== "") data.chapterId = updates.chapterId
    // Schedule fields: a datetime string sets/reschedules, explicit null
    // clears the bound, absence leaves it untouched.
    if (updates.startTime !== undefined) data.startTime = updates.startTime ? new Date(updates.startTime) : null
    if (updates.endTime !== undefined) data.endTime = updates.endTime ? new Date(updates.endTime) : null

    let result: Quiz | null
    try {
      result = await prisma.$transaction(async (tx) => {
        const updateResult = await tx.quiz.updateMany({ where: { id, version: updates.version }, data })
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
    } catch (err) {
      return handleCatalogError(err, reply)
    }

    if (!result) {
      reply.code(409)
      return { message: "This quiz was modified by someone else. Reload and try again." }
    }
    return { quiz: { ...result, questions: parseJsonField(result.questions), sections: parseJsonField(result.sections) } }
  })

  app.delete("/v1/admin/quizzes/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    try {
      await prisma.$transaction(async (tx) => {
        await tx.quiz.delete({ where: { id } })
        await tx.outbox.create({ data: tombstoneOutboxRow("Quiz", id) })
      })
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
        // Idempotent delete: already gone, but ensure dimension is still cleaned via tombstone.
        // Publish tombstone directly if the transactional one was lost to the rollback.
        try {
          await prisma.outbox.create({ data: tombstoneOutboxRow("Quiz", id) })
        } catch {}
        return { message: "Quiz deleted" }
      }
      return handleCatalogError(err, reply)
    }
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
    const parsed = questionBankListQuerySchema.safeParse(request.query ?? {})
    if (!parsed.success) {
      reply.code(400)
      return validationFailed(parsed.error)
    }
    const q = parsed.data
    const { page, limit } = q

    // AND-composed conditions: search's field-OR and multi-tag's tag-OR must
    // not clobber each other the way a single `where.OR` would. Repeated
    // ?tag= params (what the admin UI sends) arrive as arrays and are treated
    // as ANY-of matches, matching the UI's multi-select semantics.
    const conditions: Array<Record<string, unknown>> = []
    if (q.section) conditions.push({ section: q.section })
    if (q.difficulty) conditions.push({ difficulty: q.difficulty })
    if (q.search) {
      conditions.push({
        OR: [
          { question: { contains: q.search, mode: "insensitive" } },
          { explanation: { contains: q.search, mode: "insensitive" } },
        ],
      })
    }
    const tags = Array.isArray(q.tag) ? q.tag : q.tag ? [q.tag] : []
    if (tags.length > 0) conditions.push({ OR: tags.map((tag) => ({ tags: { contains: tag } })) })
    const where = conditions.length > 0 ? { AND: conditions } : {}

    const total = await prisma.questionBankItem.count({ where })
    const questions = await prisma.questionBankItem.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit })
    return {
      questions: questions.map((item) => ({ ...item, options: parseJsonField(item.options), tags: parseJsonField(item.tags) })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }
  })

  app.post("/v1/admin/question-bank", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const parsed = questionBankCreateSchema.safeParse((request.body as any) ?? {})
    if (!parsed.success) {
      reply.code(400)
      return validationFailed(parsed.error)
    }
    const { section, question, options, correctAnswer, explanation, difficulty, tags, image, source } = parsed.data
    try {
      const item = await prisma.questionBankItem.create({
        data: {
          section,
          question,
          options: stringifyForDatabase(options),
          correctAnswer,
          explanation: explanation?.trim() || "",
          difficulty,
          tags: stringifyForDatabase(tags || []),
          image: image || "",
          source: source || "",
        },
      })
      return { question: { ...item, options: parseJsonField(item.options), tags: parseJsonField(item.tags) } }
    } catch (err) {
      return handleCatalogError(err, reply)
    }
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
    const parsed = questionBankUpdateSchema.safeParse((request.body as any) ?? {})
    if (!parsed.success) {
      reply.code(400)
      return validationFailed(parsed.error)
    }
    const data: Record<string, unknown> = {}
    for (const [field, value] of Object.entries(parsed.data)) {
      if (value !== undefined) data[field] = value
    }
    if (parsed.data.options !== undefined) data.options = stringifyForDatabase(parsed.data.options)
    else delete data.options
    if (parsed.data.tags !== undefined) data.tags = stringifyForDatabase(parsed.data.tags)
    else delete data.tags
    try {
      const item = await prisma.questionBankItem.update({ where: { id }, data })
      return { question: { ...item, options: parseJsonField(item.options), tags: parseJsonField(item.tags) } }
    } catch (err) {
      return handleCatalogError(err, reply)
    }
  })

  app.delete("/v1/admin/question-bank/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    try {
      await prisma.questionBankItem.delete({ where: { id } })
    } catch (err) {
      return handleCatalogError(err, reply)
    }
    return { message: "Question deleted" }
  })

  // --------------------------------------------------------------------------- AI
  app.post("/v1/ai/quiz-generations", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const userId = getUserId(request)
    if (!userId) {
      reply.code(401)
      return { message: "Unauthorized" }
    }
    const { title, sections, difficulty, questionsPerSection } = (request.body as any) ?? {}
    if (!title || typeof title !== "string" || title.trim().length < 1 || title.trim().length > 200) {
      reply.code(400)
      return { message: "title is required (1-200 chars)" }
    }
    if (!Array.isArray(sections) || sections.length === 0 || sections.length > 5) {
      reply.code(400)
      return { message: "sections must be a non-empty array (max 5)" }
    }
    for (const s of sections) {
      if (typeof s !== "string" || s.trim().length === 0 || s.trim().length > 100) {
        reply.code(400)
        return { message: "each section must be a non-empty string (max 100 chars)" }
      }
    }
    const allowedDifficulties = ["easy", "medium", "hard"]
    const normalizedDifficulty = difficulty || "medium"
    if (!allowedDifficulties.includes(normalizedDifficulty)) {
      reply.code(400)
      return { message: "difficulty must be one of easy, medium, hard" }
    }
    const normalizedCount = questionsPerSection ?? 10
    if (typeof normalizedCount !== "number" || !Number.isInteger(normalizedCount) || normalizedCount < 1 || normalizedCount > 20) {
      reply.code(400)
      return { message: "questionsPerSection must be an integer 1-20" }
    }

    const job = await prisma.aiGenerationJob.create({
      data: {
        requestedBy: userId,
        title: title.trim(),
        sections: JSON.stringify(sections.map((s: string) => s.trim())),
        difficulty: normalizedDifficulty,
        questionsPerSection: normalizedCount,
        status: "pending",
      },
    })

    if (!producer || isKafkaDisabled()) {
      logger.warn("AI generation requested but Kafka disabled - job will stay pending without worker")
      // Don't fail the request: job is created and will be visible as pending
      // In real dev with Kafka disabled, UI can show appropriate message
    } else {
      try {
        const payload: AiQuizGenerationRequestedData = {
          jobId: job.id,
          requestedBy: userId,
          title: title.trim(),
          sections: sections.map((s: string) => s.trim()),
          difficulty: normalizedDifficulty,
          questionsPerSection: normalizedCount,
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
    }

    reply.code(202)
    return { jobId: job.id }
  })

  app.get("/v1/ai/quiz-generations/:jobId", async (request, reply) => {
    const callerId = getUserId(request)
    if (!callerId) {
      reply.code(401)
      return { message: "Unauthorized" }
    }
    const { jobId } = request.params as { jobId: string }
    const job = await prisma.aiGenerationJob.findUnique({ where: { id: jobId } })
    if (!job) {
      reply.code(404)
      return { message: "Job not found" }
    }
    const isAdmin = request.headers["x-user-is-admin"] === "true"
    if (job.requestedBy !== callerId && !isAdmin) {
      reply.code(403)
      return { message: "Forbidden" }
    }
    // Strip answer keys from polling response -- partialQuestions contains
    // correctAnswer/explanation which must never leak to non-owners and
    // should not be the API's default shape.
    const raw = (job.partialQuestions as Record<string, Array<Record<string, unknown>>>) ?? {}
    const sanitized: Record<string, unknown[]> = {}
    for (const [section, qs] of Object.entries(raw)) {
      if (!Array.isArray(qs)) continue
      sanitized[section] = qs.map((q) => ({
        id: q.id,
        section: q.section,
        question: q.question,
        options: q.options,
        tags: q.tags,
      }))
    }
    return {
      ...job,
      partialQuestions: sanitized,
    }
  })

  // Kafka optional for local dev without Docker
  let stopOutbox: () => void = () => {}
  let producer: Awaited<ReturnType<typeof getProducer>> | null = null
  try {
    if (isKafkaDisabled()) {
      logger.warn("Kafka disabled - outbox and catalog change events disabled")
    } else {
      const kafkaClient = createKafka("catalog-svc")
      producer = await getProducer(kafkaClient)
      stopOutbox = startOutboxPublisher(producer, createOutboxStore(prisma))
    }
  } catch (err) {
    logger.warn(err, "Failed to init Kafka - continuing without publishing")
  }

  async function publishChange(topic: string, key: string, data: unknown) {
    if (!producer) {
      logger.warn({ topic, key }, "publishChange skipped - Kafka disabled")
      return
    }
    try {
      await producer.send({
        topic,
        messages: [{ key, value: JSON.stringify(createEnvelope(topic, data, { producer: "catalog-svc" })) }],
      })
    } catch (err) {
      logger.warn(err, `failed to publish ${topic}`)
      throw err
    }
  }

  const close = async () => {
    stopOutbox()
    if (producer) await producer.disconnect().catch(() => {})
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
