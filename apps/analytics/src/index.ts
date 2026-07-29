import Fastify from "fastify"
import cors from "@fastify/cors"
import { randomUUID } from "node:crypto"
import { GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { PrismaClient } from "./generated/prisma/index.js"
import { createLogger, TRACE_HEADER, getOrCreateTraceId } from "@quiz/observability"
import { createKafka, getProducer, createEnvelope, TOPICS } from "@quiz/kafka-kit"
import { getRedisClient, getLeaderboard, isoWeek, keys } from "@quiz/redis-kit"
import type { ExportRequestedData } from "@quiz/contracts"
import { requireAdmin, getUserId } from "./auth.js"
import { getObjectStoreClient, EXPORT_BUCKET } from "./object-store.js"

const logger = createLogger("analytics-svc")
const prisma = new PrismaClient()
const redis = getRedisClient()
const PORT = Number(process.env.PORT) || 4004
const OVERVIEW_CACHE_TTL_SEC = 300

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

  // ------------------------------------------------------------- overview
  // Stale-while-revalidate: return the cached body immediately if present,
  // otherwise compute fresh and cache it. This is deliberately simpler than
  // ARCHITECTURE.md's full single-flight-lock version (concurrent cold
  // requests can race and both compute) -- an acceptable trade for a
  // 30-row-scan query that's cheap to duplicate occasionally.
  app.get("/v1/analytics/overview", async () => {
    const cacheKey = keys.cacheAnalyticsOverview()
    const cached = await redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const since = new Date(Date.now() - 30 * 86_400_000)
    const [daily, totalUsers, totalQuizzesAttempted] = await Promise.all([
      prisma.dailyRollup.findMany({
        where: { quizId: "__all__", subjectId: "__all__", bucketDate: { gte: since } },
        orderBy: { bucketDate: "asc" },
      }),
      prisma.dimUser.count({ where: { deletedAt: null } }),
      prisma.quizStats.count(),
    ])

    const totals = daily.reduce(
      (acc, d) => ({ attempts: acc.attempts + d.attempts, sumScore: acc.sumScore + d.sumScore }),
      { attempts: 0, sumScore: 0 }
    )

    const body = {
      last30Days: daily.map((d) => ({
        date: d.bucketDate.toISOString().slice(0, 10),
        attempts: d.attempts,
        uniqueUsers: d.uniqueUsers,
        avgScore: d.attempts > 0 ? d.sumScore / d.attempts : 0,
      })),
      totals: {
        attempts30d: totals.attempts,
        avgScore30d: totals.attempts > 0 ? totals.sumScore / totals.attempts : 0,
        totalUsers,
        totalQuizzesAttempted,
      },
    }

    await redis.set(cacheKey, JSON.stringify(body), "EX", OVERVIEW_CACHE_TTL_SEC)
    return body
  })

  // Bulk per-quiz stats for the admin quiz list -- catalog-svc's
  // /v1/admin/quizzes intentionally dropped attempts/avgScore/avgTime (see
  // its own route comment); this is where the admin UI fetches them back in.
  app.get("/v1/analytics/quizzes", async (request) => {
    const { ids } = request.query as { ids?: string }
    const quizIds = ids ? ids.split(",").filter(Boolean) : undefined
    const rows = await prisma.quizStats.findMany({ where: quizIds ? { quizId: { in: quizIds } } : undefined })
    return { quizzes: rows }
  })

  app.get("/v1/analytics/quizzes/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const [stats, sections, questions] = await Promise.all([
      prisma.quizStats.findUnique({ where: { quizId: id } }),
      prisma.attemptSectionFact.groupBy({
        by: ["section"],
        where: { quizId: id },
        _avg: { scorePct: true, timeSpentMs: true },
        _count: { _all: true },
      }),
      prisma.questionStat.findMany({ where: { quizId: id }, orderBy: { attempts: "desc" } }),
    ])
    if (!stats) {
      reply.code(404)
      return { message: "No stats yet for this quiz" }
    }
    return {
      stats,
      sections: sections.map((s) => ({
        section: s.section,
        attempts: s._count._all,
        avgScorePct: s._avg.scorePct ?? 0,
        avgTimeSpentMs: s._avg.timeSpentMs ?? 0,
      })),
      questions: questions.map((q) => ({
        questionId: q.questionId,
        section: q.section,
        attempts: q.attempts,
        correct: q.correct,
        wrong: q.wrong,
        unanswered: q.unanswered,
        pValue: q.attempts > 0 ? q.correct / q.attempts : 0,
        avgTimeMs: q.attempts > 0 ? Number(q.sumTimeMs) / q.attempts : 0,
        optionCounts: q.optionCounts,
      })),
    }
  })

  app.get("/v1/analytics/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const callerId = getUserId(request)
    if (!callerId) {
      reply.code(401)
      return { message: "Unauthorized" }
    }
    if (callerId !== id && request.headers["x-user-is-admin"] !== "true") {
      reply.code(403)
      return { message: "Forbidden" }
    }
    const [stats, activity] = await Promise.all([
      prisma.userStats.findUnique({ where: { userId: id } }),
      prisma.userDailyActivity.findMany({
        where: { userId: id, activityDate: { gte: new Date(Date.now() - 90 * 86_400_000) } },
        orderBy: { activityDate: "asc" },
      }),
    ])
    if (!stats) {
      reply.code(404)
      return { message: "No stats yet for this user" }
    }
    return { stats, activity }
  })

  // ---------------------------------------------------------- leaderboards
  // scope: "global" | "weekly" | "quiz:<id>" | "subject:<id>"
  app.get("/v1/leaderboards/:scope", async (request, reply) => {
    const { scope } = request.params as { scope: string }
    const { limit } = request.query as { limit?: string }
    const take = Math.min(Math.max(Number(limit) || 10, 1), 100)

    let key: string
    if (scope === "global") key = keys.leaderboardGlobal()
    else if (scope === "weekly") key = keys.leaderboardWeekly(isoWeek(new Date()))
    else if (scope.startsWith("quiz:")) key = keys.leaderboardQuiz(scope.slice("quiz:".length))
    else if (scope.startsWith("subject:")) key = keys.leaderboardSubject(scope.slice("subject:".length))
    else {
      reply.code(400)
      return { message: "Unknown leaderboard scope" }
    }

    const entries = await getLeaderboard(redis, key, take)
    return { scope, entries }
  })

  // -------------------------------------------------------------- exports
  app.post("/v1/admin/exports", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const requestedBy = getUserId(request) ?? "unknown"
    const body = (request.body as any) ?? {}
    const kind = body.kind === "user-performance" ? "user-performance" : "quiz-results"
    const filters = {
      from: typeof body.filters?.from === "string" ? body.filters.from : undefined,
      to: typeof body.filters?.to === "string" ? body.filters.to : undefined,
      quizIds: Array.isArray(body.filters?.quizIds) ? body.filters.quizIds : undefined,
      subjectIds: Array.isArray(body.filters?.subjectIds) ? body.filters.subjectIds : undefined,
    }

    const job = await prisma.exportJob.create({
      data: { id: randomUUID(), requestedBy, kind, filters: filters as any, status: "pending" },
    })

    // Direct produce, not the transactional outbox -- analytics-svc holds no
    // authoritative data (see schema.prisma's header comment), so there's no
    // local write that publishing atomically-with would even protect. Same
    // pattern as catalog-svc's AI-generation-requested POST.
    try {
      const kafka = createKafka("analytics-svc")
      const producer = await getProducer(kafka)
      const payload: ExportRequestedData = { jobId: job.id, requestedBy, kind, format: "csv", filters }
      await producer.send({
        topic: TOPICS.EXPORT_REQUESTED,
        messages: [{ key: job.id, value: JSON.stringify(createEnvelope(TOPICS.EXPORT_REQUESTED, payload, { producer: "analytics-svc" })) }],
      })
    } catch (err) {
      logger.error(err, "failed to publish export-requested")
      reply.code(503)
      return { message: "Failed to queue export job" }
    }

    reply.code(202)
    return { jobId: job.id }
  })

  app.get("/v1/admin/exports/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const job = await prisma.exportJob.findUnique({ where: { id } })
    if (!job) {
      reply.code(404)
      return { message: "Export job not found" }
    }

    let downloadUrl: string | null = null
    if (job.status === "done" && job.objectKey) {
      downloadUrl = await getSignedUrl(
        getObjectStoreClient(),
        new GetObjectCommand({ Bucket: EXPORT_BUCKET, Key: job.objectKey }),
        { expiresIn: 24 * 60 * 60 }
      )
    }

    return { job, downloadUrl }
  })

  const close = async () => {
    await prisma.$disconnect()
    await app.close()
    process.exit(0)
  }
  process.on("SIGTERM", close)
  process.on("SIGINT", close)

  await app.listen({ port: PORT, host: "0.0.0.0" })
  logger.info(`analytics-svc listening on :${PORT}`)
}

main().catch((err) => {
  logger.error(err, "analytics-svc failed to start")
  process.exit(1)
})
