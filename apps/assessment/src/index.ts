import Fastify from "fastify"
import cors from "@fastify/cors"
import { PrismaClient } from "./generated/prisma/index.js"
import { createLogger, TRACE_HEADER, getOrCreateTraceId } from "@quiz/observability"
import { createKafka, getProducer, startOutboxPublisher } from "@quiz/kafka-kit"
import { autosaveRequestSchema, startAttemptRequestSchema, submitAttemptRequestSchema } from "@quiz/contracts"
import { createOutboxStore } from "./outbox-store.js"
import { requireUser, requireAdmin } from "./auth.js"
import { startOrResumeAttempt, autosaveAnswers, submitAttempt, getResult, NotFoundError, ForbiddenError, ConflictError } from "./attempt-service.js"
import { registerLegacyRoutes } from "./legacy.js"
import { fetchQuizMeta, type LegacyQuizMeta } from "./legacy-client.js"

const logger = createLogger("assessment-svc")
const prisma = new PrismaClient()
const PORT = Number(process.env.PORT) || 4003

function handleServiceError(err: unknown, reply: any) {
  if (err instanceof NotFoundError) {
    reply.code(404)
    return { message: err.message }
  }
  if (err instanceof ForbiddenError) {
    reply.code(403)
    return { message: err.message }
  }
  if (err instanceof ConflictError) {
    reply.code(409)
    return { message: err.message }
  }
  throw err
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

  // --------------------------------------------------------------- attempts
  app.post("/v1/attempts", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const parsed = startAttemptRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { message: parsed.error.issues[0]?.message ?? "Invalid request body" }
    }
    try {
      const result = await startOrResumeAttempt(prisma, user, parsed.data.quizId, parsed.data.clientIdemKey)
      reply.code(result.resumed ? 200 : 201)
      return result
    } catch (err) {
      return handleServiceError(err, reply)
    }
  })

  app.patch("/v1/attempts/:id/answers", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const { id } = request.params as { id: string }
    const parsed = autosaveRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { message: parsed.error.issues[0]?.message ?? "answers must be a non-empty array" }
    }
    try {
      const saved = await autosaveAnswers(prisma, id, user.userId, parsed.data.answers)
      return { saved }
    } catch (err) {
      return handleServiceError(err, reply)
    }
  })

  app.post("/v1/attempts/:id/submit", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const { id } = request.params as { id: string }
    const parsed = submitAttemptRequestSchema.safeParse(request.body ?? {})
    const submitSource = parsed.success ? parsed.data.submitSource ?? "user" : "user"
    try {
      return await submitAttempt(prisma, id, user.userId, submitSource)
    } catch (err) {
      return handleServiceError(err, reply)
    }
  })

  app.get("/v1/attempts/:id/result", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const { id } = request.params as { id: string }
    try {
      const result = await getResult(prisma, id, user.userId)
      reply.header("Cache-Control", "private, no-store")
      return { result }
    } catch (err) {
      return handleServiceError(err, reply)
    }
  })

  // Cursor-paginated history -- collapses the monolith's three near-duplicate
  // /api/results, /results/history, /results/recent routes (they differed
  // only by `take` and an implicit status filter) into one endpoint. Rows are
  // self-sufficient (scores + section breakdown persisted at scoring time)
  // and enriched with quiz metadata from catalog-svc's internal bulk-meta
  // read, so clients render titles without one lookup per row.
  app.get("/v1/attempts", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const q = request.query as { limit?: string; cursor?: string; status?: string }
    const limit = Math.min(Math.max(Number(q.limit) || 20, 1), 100)
    const where: any = { userId: user.userId }
    if (q.status) where.status = q.status

    const rows = await prisma.attempt.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    })
    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows

    const quizMeta = await fetchQuizMeta().catch(() => new Map<string, LegacyQuizMeta>())

    return {
      attempts: page.map((a) => {
        const meta = quizMeta.get(a.quizId)
        return {
          attemptId: a.id,
          quizId: a.quizId,
          status: a.status,
          startedAt: a.startedAt,
          submittedAt: a.submittedAt,
          totalScore: a.totalScore,
          correctCount: a.correctCount,
          wrongCount: a.wrongCount,
          unansweredCount: a.unansweredCount,
          maxScore: a.maxScore,
          rawScore: a.rawScore,
          timeSpentMs: a.timeSpentMs,
          sectionScores: a.sectionScores ?? null,
          quizTitle: meta?.title ?? null,
          chapterName: meta?.chapterName ?? null,
          subjectName: meta?.subjectName ?? null,
          subjectColor: meta?.subjectColor ?? null,
        }
      }),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    }
  })

  // ------------------------------------------------------------------ admin
  app.get("/v1/admin/attempts", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const q = request.query as { limit?: string; cursor?: string; status?: string; quizId?: string; userId?: string }
    const limit = Math.min(Math.max(Number(q.limit) || 20, 1), 100)
    const where: any = {}
    if (q.status) where.status = q.status
    if (q.quizId) where.quizId = q.quizId
    if (q.userId) where.userId = q.userId

    const rows = await prisma.attempt.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
    })
    const hasMore = rows.length > limit
    const page = hasMore ? rows.slice(0, limit) : rows
    return { attempts: page, nextCursor: hasMore ? page[page.length - 1].id : null }
  })

  app.delete("/v1/admin/attempts/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    try {
      await prisma.attempt.delete({ where: { id } }) // AttemptAnswer cascades
    } catch {
      reply.code(404)
      return { message: "Attempt not found" }
    }
    return { deleted: true }
  })

  registerLegacyRoutes(app, prisma)

  const kafkaClient = createKafka("assessment-svc")
  const producer = await getProducer(kafkaClient)
  const stopOutbox = startOutboxPublisher(producer, createOutboxStore(prisma))

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
  logger.info(`assessment-svc listening on :${PORT}`)
}

main().catch((err) => {
  logger.error(err, "assessment-svc failed to start")
  process.exit(1)
})
