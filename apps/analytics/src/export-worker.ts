// Consumes quiz.analytics.export-requested.v1 and streams a CSV to MinIO/S3
// at constant memory regardless of row count -- this is the actual fix for
// the monolith's CSV export route, which built the whole response in memory
// before sending it. Not literally Postgres COPY (no pg-copy-streams
// dependency in this pass); instead a Prisma keyset-paginated async
// generator feeds a Readable that @aws-sdk/lib-storage's Upload multiparts
// to the bucket as it goes, so memory stays bounded to one page at a time.
import { Readable } from "node:stream"
import { Upload } from "@aws-sdk/lib-storage"
import { PrismaClient } from "./generated/prisma/index.js"
import { createLogger, ensureDatabaseUrl } from "@quiz/observability"
import { createKafka, createEnvelope, runConsumer, getProducer, TOPICS, isKafkaDisabled } from "@quiz/kafka-kit"
import type { ExportRequestedData, ExportCompletedData } from "@quiz/contracts"
import { getObjectStoreClient, EXPORT_BUCKET } from "./object-store.js"
import { csvRow } from "./csv.js"

const logger = createLogger("analytics-export-worker")
ensureDatabaseUrl("analytics")
const prisma = new PrismaClient()
const PAGE_SIZE = 500
const PRESIGNED_TTL_SEC = 24 * 60 * 60

const processedEventStore = {
  async hasProcessed(eventId: string): Promise<boolean> {
    const row = await prisma.processedEvent.findUnique({ where: { eventId } })
    return row !== null
  },
}

interface ExportResult {
  rowCount: number
}

async function* quizResultsRows(filters: ExportRequestedData["filters"]): AsyncGenerator<string> {
  yield csvRow(["attemptId", "quizId", "quizTitle", "userId", "userName", "submittedAt", "totalScore", "correctCount", "wrongCount", "unansweredCount", "timeSpentMs"])

  const where: any = {}
  if (filters.from) where.submittedAt = { ...where.submittedAt, gte: new Date(filters.from) }
  if (filters.to) where.submittedAt = { ...where.submittedAt, lte: new Date(filters.to) }
  if (filters.quizIds?.length) where.quizId = { in: filters.quizIds }
  if (filters.subjectIds?.length) where.subjectId = { in: filters.subjectIds }

  let cursor: string | undefined
  for (;;) {
    const rows = await prisma.attemptFact.findMany({
      where,
      orderBy: { attemptId: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { attemptId: cursor }, skip: 1 } : {}),
    })
    if (rows.length === 0) break

    const quizIds = [...new Set(rows.map((r) => r.quizId))]
    const userIds = [...new Set(rows.map((r) => r.userId))]
    const [quizzes, users] = await Promise.all([
      prisma.dimQuiz.findMany({ where: { quizId: { in: quizIds } } }),
      prisma.dimUser.findMany({ where: { userId: { in: userIds } } }),
    ])
    const quizTitles = new Map(quizzes.map((q) => [q.quizId, q.title]))
    const userNames = new Map(users.map((u) => [u.userId, u.name]))

    for (const r of rows) {
      yield csvRow([
        r.attemptId,
        r.quizId,
        quizTitles.get(r.quizId) ?? "",
        r.userId,
        userNames.get(r.userId) ?? "",
        r.submittedAt.toISOString(),
        r.totalScore,
        r.correctCount,
        r.wrongCount,
        r.unansweredCount,
        r.timeSpentMs,
      ])
    }
    cursor = rows[rows.length - 1].attemptId
    if (rows.length < PAGE_SIZE) break
  }
}

async function* userPerformanceRows(): AsyncGenerator<string> {
  yield csvRow(["userId", "userName", "email", "attempts", "avgScore", "bestScore", "last20Avg", "currentStreakDays", "longestStreakDays", "lastAttemptAt"])

  let cursor: string | undefined
  for (;;) {
    const rows = await prisma.userStats.findMany({
      orderBy: { userId: "asc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { userId: cursor }, skip: 1 } : {}),
    })
    if (rows.length === 0) break

    const users = await prisma.dimUser.findMany({ where: { userId: { in: rows.map((r) => r.userId) } } })
    const byId = new Map(users.map((u) => [u.userId, u]))

    for (const r of rows) {
      const u = byId.get(r.userId)
      yield csvRow([r.userId, u?.name ?? "", u?.email ?? "", r.attempts, r.avgScore, r.bestScore, r.last20Avg, r.currentStreakDays, r.longestStreakDays, r.lastAttemptAt?.toISOString() ?? ""])
    }
    cursor = rows[rows.length - 1].userId
    if (rows.length < PAGE_SIZE) break
  }
}

async function runExport(jobId: string, data: ExportRequestedData): Promise<ExportResult> {
  const generator = data.kind === "quiz-results" ? quizResultsRows(data.filters) : userPerformanceRows()

  let rowCount = 0
  const countingStream = (async function* () {
    for await (const line of generator) {
      rowCount++
      yield line
    }
  })()

  const objectKey = `${data.kind}/${jobId}.csv`
  const upload = new Upload({
    client: getObjectStoreClient(),
    params: { Bucket: EXPORT_BUCKET, Key: objectKey, Body: Readable.from(countingStream), ContentType: "text/csv" },
  })
  await upload.done()

  return { rowCount: rowCount - 1 } // subtract the header row
}

async function main() {
  if (isKafkaDisabled()) {
    logger.warn("Kafka disabled - analytics-export-worker idle (exports require Kafka)")
    await new Promise(() => {})
    return
  }
  // S3 is optional for local dev: check if export storage is configured
  if (!process.env.S3_ENDPOINT && !process.env.S3_ACCESS_KEY && process.env.DISABLE_S3 === "true") {
    logger.warn("S3 disabled - export worker will fail exports until S3/MinIO is configured")
  }
  const kafka = createKafka("analytics-export-worker")
  const producer = await getProducer(kafka)

  await runConsumer<ExportRequestedData>(kafka, {
    groupId: "analytics-export-worker",
    topics: [TOPICS.EXPORT_REQUESTED],
    // A large export can take minutes to stream; don't let the default
    // 300s poll interval evict this consumer mid-job (same foot-gun as
    // catalog-svc's ai-worker, documented there and in ARCHITECTURE.md).
    maxPollIntervalMs: 15 * 60_000,
    store: processedEventStore,
    async onMessage({ envelope }) {
      const { jobId } = envelope.data
      await prisma.exportJob.update({ where: { id: jobId }, data: { status: "running" } }).catch(() => null)

      let completed: ExportCompletedData
      try {
        const { rowCount } = await runExport(jobId, envelope.data)
        const objectKey = `${envelope.data.kind}/${jobId}.csv`
        const expiresAt = new Date(Date.now() + PRESIGNED_TTL_SEC * 1000)
        await prisma.exportJob.update({
          where: { id: jobId },
          data: { status: "done", objectKey, rowCount, completedAt: new Date() },
        })
        completed = { jobId, status: "done", objectKey, rowCount, bytes: null, expiresAt: expiresAt.toISOString(), error: null }
        logger.info({ jobId, rowCount }, "export completed")
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err)
        await prisma.exportJob.update({ where: { id: jobId }, data: { status: "failed", error, completedAt: new Date() } })
        completed = { jobId, status: "failed", objectKey: null, rowCount: null, bytes: null, expiresAt: null, error }
        logger.error({ jobId, error }, "export failed")
      }

      await prisma.processedEvent.create({ data: { eventId: envelope.eventId, consumerGroup: "analytics-export-worker" } }).catch(() => null)

      await producer.send({
        topic: TOPICS.EXPORT_COMPLETED,
        messages: [{ key: jobId, value: JSON.stringify(createEnvelope(TOPICS.EXPORT_COMPLETED, completed, { producer: "analytics-export-worker" })) }],
      })
    },
  })

  logger.info("analytics-export-worker consuming quiz.analytics.export-requested.v1")
}

main().catch((err) => {
  logger.error(err, "analytics-export-worker failed to start")
  process.exit(1)
})
