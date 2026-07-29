import Fastify from "fastify"
import cors from "@fastify/cors"
import { PrismaClient } from "./generated/prisma/index.js"
import { createLogger, TRACE_HEADER, getOrCreateTraceId } from "@quiz/observability"
import { createKafka, getProducer, startOutboxPublisher, createEnvelope, TOPICS } from "@quiz/kafka-kit"
import { loginRequestSchema, signupRequestSchema, type UserChangedData } from "@quiz/contracts"
import { createOutboxStore } from "./outbox-store.js"

const logger = createLogger("identity-svc")
const prisma = new PrismaClient()
const PORT = Number(process.env.PORT) || 4001

function mintToken(userId: string): string {
  return `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// Same convention as the old monolith's nine duplicated validateToken copies,
// consolidated here since this is the one service that actually needs it now
// -- everything else trusts headers this service's /v1/internal/introspect
// endpoint effectively vouches for, via the gateway.
async function parseToken(token: string): Promise<{ userId: string; timestamp: number } | null> {
  const lastDash = token.lastIndexOf("-")
  const secondLastDash = token.lastIndexOf("-", lastDash - 1)
  if (lastDash === -1 || secondLastDash === -1) return null

  const userId = token.substring(0, secondLastDash)
  const timestamp = parseInt(token.substring(secondLastDash + 1, lastDash), 10)
  if (isNaN(timestamp)) return null

  const maxAgeMs = 30 * 24 * 60 * 60 * 1000
  if (Date.now() - timestamp > maxAgeMs) return null

  return { userId, timestamp }
}

function userChangedPayload(user: { id: string; name: string; email: string; isAdmin: boolean; userType: string; createdAt: Date }): UserChangedData {
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    isAdmin: user.isAdmin,
    userType: user.userType,
    createdAt: user.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
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

  app.post("/v1/auth/login", async (request, reply) => {
    const parsed = loginRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { message: "Email, password, and user type are required" }
    }
    const { email, password, userType } = parsed.data

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (!user) {
      reply.code(401)
      return { message: "Invalid credentials" }
    }

    if (userType === "admin" && !user.isAdmin) {
      reply.code(403)
      return { message: "Access denied. Admin credentials required." }
    }
    if (userType === "student" && user.isAdmin) {
      reply.code(403)
      return { message: "Please use admin login for administrative access." }
    }

    // Plaintext compare -- unchanged from the monolith by explicit instruction
    // (auth is not being redesigned in this pass). See ARCHITECTURE.md Phase 2
    // for the deferred hardening plan.
    if (user.password !== password) {
      reply.code(401)
      return { message: "Invalid credentials" }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } })
      await tx.outbox.create({
        data: {
          aggregateType: "User",
          aggregateId: u.id,
          topic: TOPICS.USER_CHANGED,
          key: u.id,
          payload: createEnvelope(TOPICS.USER_CHANGED, userChangedPayload(u), { producer: "identity-svc" }) as any,
          headers: { "content-type": "application/json", "event-type": TOPICS.USER_CHANGED },
        },
      })
      return u
    })

    const token = mintToken(updated.id)
    logger.info({ userId: updated.id, traceId: (request as any).traceId }, "login successful")

    return {
      token,
      user: { id: updated.id, name: updated.name, email: updated.email, isAdmin: updated.isAdmin, userType: updated.userType },
    }
  })

  app.post("/v1/auth/signup", async (request, reply) => {
    const parsed = signupRequestSchema.safeParse(request.body)
    if (!parsed.success) {
      reply.code(400)
      return { message: "Name, email, and password (6+ characters) are required" }
    }
    const { name, email, password } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) {
      reply.code(400)
      return { message: "User already exists" }
    }

    const created = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
          isAdmin: false,
          userType: "student",
          lastLogin: new Date(),
        },
      })
      await tx.outbox.create({
        data: {
          aggregateType: "User",
          aggregateId: u.id,
          topic: TOPICS.USER_CHANGED,
          key: u.id,
          payload: createEnvelope(TOPICS.USER_CHANGED, userChangedPayload(u), { producer: "identity-svc" }) as any,
          headers: { "content-type": "application/json", "event-type": TOPICS.USER_CHANGED },
        },
      })
      return u
    })

    const token = mintToken(created.id)
    return {
      token,
      user: { id: created.id, name: created.name, email: created.email, isAdmin: created.isAdmin, userType: created.userType },
    }
  })

  // Called by the gateway (with a short Redis-cached TTL in front of it, see
  // packages/redis-kit's keys.tokenCache) so it isn't hitting Postgres on
  // every single request the way the old nine duplicated validateToken copies
  // did. Never throws for a bad/expired token -- always `{valid: false}`.
  app.post("/v1/internal/introspect", async (request) => {
    const { token } = (request.body as { token?: string }) ?? {}
    if (!token) return { valid: false }

    const parsed = await parseToken(token)
    if (!parsed) return { valid: false }

    const user = await prisma.user.findUnique({ where: { id: parsed.userId } })
    if (!user) return { valid: false }

    return { valid: true, userId: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin }
  })

  // Bulk user list for assessment-svc's legacy (pre-Attempt QuizResult)
  // admin/users reporting route -- internal only, never gateway-routed.
  app.get("/v1/internal/users", async () => {
    const users = await prisma.user.findMany()
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin,
      userType: u.userType,
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
    }))
  })

  app.get("/v1/users/:id", async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) {
      reply.code(404)
      return { message: "User not found" }
    }
    return { id: user.id, name: user.name, email: user.email, isAdmin: user.isAdmin, userType: user.userType }
  })

  const kafka = createKafka("identity-svc")
  const producer = await getProducer(kafka)
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
  logger.info(`identity-svc listening on :${PORT}`)
}

main().catch((err) => {
  logger.error(err, "identity-svc failed to start")
  process.exit(1)
})
