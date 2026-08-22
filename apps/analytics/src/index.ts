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

  // Admin analytics reads: joined AttemptFact + DimUser/DimQuiz rows for the
  // admin dashboard, and per-user stat cards. Serves the shapes the admin UI
  // previously got from the legacy pre-split QuizResult table.
  app.get("/v1/analytics/facts/results", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const facts = await prisma.attemptFact.findMany({ orderBy: { submittedAt: "desc" }, take: 500 })
    const attemptIds = facts.map((f) => f.attemptId)
    const [users, quizzes, sectionFacts] = await Promise.all([
      prisma.dimUser.findMany({ where: { deletedAt: null } }),
      prisma.dimQuiz.findMany(),
      // Scoped to the fetched attempts so this query stays bounded as the
      // fact tables grow; unbounded would load every section row in history.
      prisma.attemptSectionFact.findMany({ where: { attemptId: { in: attemptIds } } }),
    ])
    const userById = new Map(users.map((u) => [u.userId, u]))
    const quizById = new Map(quizzes.map((q) => [q.quizId, q]))
    const sectionsByAttempt = new Map<string, Record<string, number>>()
    for (const s of sectionFacts) {
      const m = sectionsByAttempt.get(s.attemptId) ?? {}
      m[s.section] = s.scorePct
      sectionsByAttempt.set(s.attemptId, m)
    }

    const results = facts.map((f) => {
      const user = userById.get(f.userId)
      const quiz = quizById.get(f.quizId)
      return {
        id: f.attemptId,
        _id: f.attemptId,
        date: f.submittedAt.toISOString(),
        quizId: f.quizId,
        quizName: quiz?.title ?? "Unknown Quiz",
        totalScore: f.totalScore,
        rawScore: f.rawScore,
        maxScore: f.maxScore,
        correctAnswers: f.correctCount,
        wrongAnswers: f.wrongCount,
        unanswered: f.unansweredCount,
        timeSpent: Math.round(f.timeSpentMs / 1000),
        userId: f.userId,
        userName: user?.name ?? "Unknown User",
        userEmail: user?.email ?? "",
        user: { id: f.userId, name: user?.name ?? "Unknown User", email: user?.email ?? "" },
        quiz: { id: f.quizId, title: quiz?.title ?? "Unknown Quiz" },
        sections: sectionsByAttempt.get(f.attemptId) ?? {},
      }
    })

    return {
      success: true,
      results,
      quizzes: quizzes.map((q) => ({ id: q.quizId, title: q.title, questionCount: q.questionCount, isActive: q.isActive })),
    }
  })

  app.get("/v1/analytics/facts/users", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const [users, stats] = await Promise.all([
      prisma.dimUser.findMany({ where: { deletedAt: null } }),
      prisma.userStats.findMany(),
    ])
    const statsByUser = new Map(stats.map((s) => [s.userId, s]))

    return {
      users: users.map((u) => {
        const s = statsByUser.get(u.userId)
        return {
          id: u.userId,
          name: u.name,
          email: u.email,
          userType: u.userType,
          isAdmin: u.isAdmin,
          joinDate: u.registeredAt?.toISOString() ?? u.updatedAt.toISOString(),
          lastActive: s?.lastAttemptAt?.toISOString() ?? null,
          totalAttempts: s?.attempts ?? 0,
          averageScore: s?.avgScore != null ? Math.round(s.avgScore) : 0,
          bestScore: s?.bestScore != null ? Math.round(s.bestScore) : 0,
        }
      }),
    }
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
    const [stats, activity, user, facts] = await Promise.all([
      prisma.userStats.findUnique({ where: { userId: id } }),
      prisma.userDailyActivity.findMany({
        where: { userId: id, activityDate: { gte: new Date(Date.now() - 90 * 86_400_000) } },
        orderBy: { activityDate: "asc" },
      }),
      prisma.dimUser.findUnique({ where: { userId: id } }),
      prisma.attemptFact.findMany({ where: { userId: id }, orderBy: { submittedAt: "desc" } }),
    ])
    if (!stats) {
      reply.code(404)
      return { message: "No stats yet for this user" }
    }

    // quizPerformance matches the admin modal's per-quiz breakdown shape.
    const byQuiz = new Map<string, { attempts: Array<Record<string, unknown>>; bestScore: number; sumScore: number; sumTimeMs: number }>()
    for (const f of facts) {
      const entry = byQuiz.get(f.quizId) ?? { attempts: [], bestScore: 0, sumScore: 0, sumTimeMs: 0 }
      entry.attempts.push({ id: f.attemptId, date: f.submittedAt.toISOString(), totalScore: f.totalScore, timeSpent: Math.round(f.timeSpentMs / 1000) })
      entry.bestScore = Math.max(entry.bestScore, f.totalScore)
      entry.sumScore += f.totalScore
      entry.sumTimeMs += f.timeSpentMs
      byQuiz.set(f.quizId, entry)
    }
    const quizzes = await prisma.dimQuiz.findMany()
    const titleByQuiz = new Map(quizzes.map((q) => [q.quizId, q.title]))
    const quizPerformance = Array.from(byQuiz.entries()).map(([quizId, agg]) => ({
      quizId,
      quizTitle: titleByQuiz.get(quizId) ?? "Unknown Quiz",
      totalAttempts: agg.attempts.length,
      bestScore: agg.bestScore,
      averageScore: agg.attempts.length > 0 ? Math.round(agg.sumScore / agg.attempts.length) : 0,
      averageTime: agg.attempts.length > 0 ? Math.round(agg.sumTimeMs / agg.attempts.length / 60000) : 0,
      attempts: agg.attempts,
    }))

    return {
      stats,
      activity,
      user: {
        id,
        name: user?.name ?? "Unknown User",
        email: user?.email ?? "",
        totalQuizzes: stats.attempts,
        averageScore: stats.avgScore != null ? Math.round(stats.avgScore) : 0,
      },
      quizPerformance,
    }
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

  // Admin deletions over the derived facts. AttemptFact rows are rebuildable
  // from Kafka, so a consumer-group reset would resurrect deleted history --
  // accepted trade-off; the legacy table had the same property. DailyRollup
  // aggregates are deliberately NOT rewritten (same as the legacy table never
  // rewrote past aggregates).
  app.delete("/v1/admin/attempts/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const deleted = await prisma.attemptFact.deleteMany({ where: { attemptId: id } })
    if (deleted.count === 0) {
      reply.code(404)
      return { message: "Result not found" }
    }
    await redis.del(keys.cacheAnalyticsOverview())
    return { message: "Quiz result deleted successfully", deletedId: id }
  })

  app.delete("/v1/admin/users/:userId/attempts", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { userId } = request.params as { userId: string }
    const quizId = (request.query as { quizId?: string }).quizId
    const deleted = await prisma.attemptFact.deleteMany({
      where: quizId ? { userId, quizId } : { userId },
    })
    if (deleted.count === 0) {
      reply.code(404)
      return { message: "No results found for this user" }
    }
    await redis.del(keys.cacheAnalyticsOverview())
    return { message: "User results deleted successfully", deletedCount: deleted.count }
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
