// assessment-svc's worker process: the outbox publisher (same as every other
// service) plus the expiry sweeper -- the one job unique to this service.
//
// The sweeper finds IN_PROGRESS attempts past expiresAt and auto-submits them
// with submitSource='sweeper', reusing the exact same submitAttempt() the API
// uses for a user-initiated submit. Its query is what the attempt_sweeper
// partial index (expires_at WHERE status='IN_PROGRESS') exists for -- the
// index stays tiny because finished attempts drop out of it entirely.
//
// No distributed lock guards this against running on multiple worker
// replicas: submitAttempt()'s Postgres CAS (`UPDATE ... WHERE status =
// 'IN_PROGRESS'`) already makes a double-sweep a no-op (see ARCHITECTURE.md's
// "if you need a correctness-critical distributed lock, your transaction
// boundary is in the wrong place").
import { PrismaClient } from "./generated/prisma/index.js"
import { createLogger } from "@quiz/observability"
import { createKafka, getProducer, startOutboxPublisher } from "@quiz/kafka-kit"
import { createOutboxStore } from "./outbox-store.js"
import { submitAttempt } from "./attempt-service.js"

const logger = createLogger("assessment-worker")
const prisma = new PrismaClient()
const SWEEP_INTERVAL_MS = Number(process.env.SWEEP_INTERVAL_MS) || 15_000
const SWEEP_BATCH_SIZE = Number(process.env.SWEEP_BATCH_SIZE) || 100

async function sweepExpiredAttempts() {
  const candidates = await prisma.attempt.findMany({
    where: { status: "IN_PROGRESS", expiresAt: { lte: new Date() } },
    select: { id: true },
    take: SWEEP_BATCH_SIZE,
  })

  for (const { id } of candidates) {
    try {
      await submitAttempt(prisma, id, null, "sweeper")
    } catch (err) {
      logger.error(err, `sweeper failed to auto-submit attempt ${id}`)
    }
  }

  if (candidates.length > 0) {
    logger.info(`sweeper auto-submitted ${candidates.length} expired attempt(s)`)
  }
}

async function main() {
  const kafkaClient = createKafka("assessment-worker")
  const producer = await getProducer(kafkaClient)
  const stopOutbox = startOutboxPublisher(producer, createOutboxStore(prisma))

  const sweepTimer = setInterval(() => {
    sweepExpiredAttempts().catch((err) => logger.error(err, "sweep cycle failed"))
  }, SWEEP_INTERVAL_MS)

  const close = async () => {
    clearInterval(sweepTimer)
    stopOutbox()
    await producer.disconnect()
    await prisma.$disconnect()
    process.exit(0)
  }
  process.on("SIGTERM", close)
  process.on("SIGINT", close)

  logger.info(`assessment-worker started (sweep every ${SWEEP_INTERVAL_MS}ms, batch ${SWEEP_BATCH_SIZE})`)
}

main().catch((err) => {
  logger.error(err, "assessment-worker failed to start")
  process.exit(1)
})
