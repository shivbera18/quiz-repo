import Fastify from "fastify"
import cors from "@fastify/cors"
import { randomUUID } from "node:crypto"
import { PrismaClient } from "./generated/prisma/index.js"
import { createLogger, TRACE_HEADER, getOrCreateTraceId } from "@quiz/observability"
import { createKafka, getProducer, startOutboxPublisher, createEnvelope, TOPICS } from "@quiz/kafka-kit"
import { getRedisClient, keys } from "@quiz/redis-kit"
import type { AnnouncementPublishedData } from "@quiz/contracts"
import { createOutboxStore } from "./outbox-store.js"
import { requireUser, requireAdmin, getUser } from "./auth.js"
import { getBacklogSince, type SseEvent } from "./sse.js"

const logger = createLogger("notification-svc")
const prisma = new PrismaClient()
const redis = getRedisClient()
const PORT = Number(process.env.PORT) || 4005
const SSE_TICKET_TTL_SEC = 30

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

  // ------------------------------------------------------------ announcements
  app.get("/v1/announcements", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return

    const announcements = await prisma.announcement.findMany({
      where: { isActive: true, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      include: { readBy: { where: { userId: user.userId } } },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    })

    const withReadStatus = announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      priority: a.priority,
      createdAt: a.createdAt,
      expiresAt: a.expiresAt,
      isRead: a.readBy.length > 0,
    }))

    return { announcements: withReadStatus, unreadCount: withReadStatus.filter((a) => !a.isRead).length }
  })

  app.post("/v1/announcements/:id/read", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const { id } = request.params as { id: string }
    await prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId: id, userId: user.userId } },
      update: {},
      create: { announcementId: id, userId: user.userId },
    })
    return { success: true }
  })

  app.get("/v1/admin/announcements", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const [announcements, totalUsers] = await Promise.all([
      prisma.announcement.findMany({ include: { _count: { select: { readBy: true } } }, orderBy: { createdAt: "desc" } }),
      prisma.userRef.count(),
    ])
    return {
      announcements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        priority: a.priority,
        isActive: a.isActive,
        createdAt: a.createdAt,
        expiresAt: a.expiresAt,
        createdBy: a.createdBy,
        readCount: a._count.readBy,
        totalUsers,
        readPercentage: totalUsers > 0 ? Math.round((a._count.readBy / totalUsers) * 100) : 0,
      })),
    }
  })

  app.post("/v1/admin/announcements", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const user = requireUser(request, reply)
    if (!user) return
    const { title, content, priority, expiresAt } = (request.body as any) ?? {}
    if (!title || !content) {
      reply.code(400)
      return { message: "Title and content are required" }
    }

    // The announcement write and its outbox row land in one transaction --
    // fanout-worker.ts does the actual push/SSE fan-out asynchronously. This
    // replaces the monolith's inline sendPushNotificationToAllUsers() call,
    // which awaited one HTTP send + one DB update per subscription inside
    // this same request (see ARCHITECTURE.md's push fan-out note).
    const announcement = await prisma.$transaction(async (tx) => {
      const created = await tx.announcement.create({
        data: { title, content, priority: priority || "normal", expiresAt: expiresAt ? new Date(expiresAt) : null, createdBy: user.userId },
      })
      const payload: AnnouncementPublishedData = { announcementId: created.id, title: created.title, content: created.content, priority: created.priority }
      await tx.outbox.create({
        data: {
          aggregateType: "Announcement",
          aggregateId: created.id,
          topic: TOPICS.ANNOUNCEMENT_PUBLISHED,
          key: created.id,
          payload: createEnvelope(TOPICS.ANNOUNCEMENT_PUBLISHED, payload, { producer: "notification-svc" }) as any,
          headers: { "content-type": "application/json", "event-type": TOPICS.ANNOUNCEMENT_PUBLISHED },
        },
      })
      return created
    })

    return { success: true, announcement }
  })

  app.put("/v1/admin/announcements/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const { title, content, priority, isActive, expiresAt } = (request.body as any) ?? {}
    try {
      const announcement = await prisma.announcement.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(content && { content }),
          ...(priority && { priority }),
          ...(typeof isActive === "boolean" && { isActive }),
          ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
        },
      })
      return { success: true, announcement }
    } catch {
      reply.code(404)
      return { message: "Announcement not found" }
    }
  })

  app.delete("/v1/admin/announcements/:id", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    try {
      await prisma.announcement.delete({ where: { id } })
    } catch {
      reply.code(404)
      return { message: "Announcement not found" }
    }
    return { success: true, message: "Announcement deleted" }
  })

  // Re-publishes the same ANNOUNCEMENT_PUBLISHED event with a fresh eventId --
  // fanout-worker.ts's idempotency check is keyed on eventId, so this is
  // treated as a brand new fan-out (re-broadcasts SSE and re-sends push to
  // every active subscription), not a no-op replay. Direct produce, not the
  // transactional outbox: there's no paired local write this time, just a
  // re-announce of state that already exists.
  app.post("/v1/admin/announcements/:id/repush", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id } = request.params as { id: string }
    const announcement = await prisma.announcement.findUnique({ where: { id } })
    if (!announcement) {
      reply.code(404)
      return { message: "Announcement not found" }
    }

    const payload: AnnouncementPublishedData = {
      announcementId: announcement.id,
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority,
    }
    try {
      const kafka = createKafka("notification-svc")
      const producer = await getProducer(kafka)
      await producer.send({
        topic: TOPICS.ANNOUNCEMENT_PUBLISHED,
        messages: [{ key: announcement.id, value: JSON.stringify(createEnvelope(TOPICS.ANNOUNCEMENT_PUBLISHED, payload, { producer: "notification-svc" })) }],
      })
    } catch (err) {
      logger.error(err, "failed to publish repush event")
      reply.code(503)
      return { message: "Failed to queue repush" }
    }

    return { success: true, message: "Announcement repush queued" }
  })

  // ------------------------------------------------------- push subscriptions
  app.post("/v1/push-subscriptions", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const { endpoint, keys: pushKeys } = (request.body as any) ?? {}
    if (!endpoint || !pushKeys?.p256dh || !pushKeys?.auth) {
      reply.code(400)
      return { message: "Invalid subscription data" }
    }

    const subscription = await prisma.pushSubscription.upsert({
      where: { userId_endpoint: { userId: user.userId, endpoint } },
      update: { p256dh: pushKeys.p256dh, auth: pushKeys.auth, userAgent: request.headers["user-agent"], isActive: true, lastUsedAt: new Date() },
      create: { userId: user.userId, endpoint, p256dh: pushKeys.p256dh, auth: pushKeys.auth, userAgent: request.headers["user-agent"] as string | undefined, lastUsedAt: new Date() },
    })

    return { success: true, subscription }
  })

  app.delete("/v1/push-subscriptions", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const { endpoint } = request.query as { endpoint?: string }
    if (!endpoint) {
      reply.code(400)
      return { message: "endpoint query parameter required" }
    }
    const subscription = await prisma.pushSubscription.findUnique({ where: { userId_endpoint: { userId: user.userId, endpoint } } })
    if (!subscription) {
      reply.code(404)
      return { message: "Subscription not found" }
    }
    await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { isActive: false } })
    return { success: true }
  })

  // ------------------------------------------------------------------- SSE
  // EventSource can't send an Authorization header, so the gateway's usual
  // header-trust auth doesn't apply to this route. A single-use ticket
  // (minted by an authenticated call, consumed via GETDEL so it can't be
  // replayed) is the bridge -- see ARCHITECTURE.md's realtime section.
  app.post("/v1/stream/tickets", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const ticket = randomUUID()
    await redis.set(keys.sseTicket(ticket), user.userId, "EX", SSE_TICKET_TTL_SEC)
    return { ticket, expiresInSec: SSE_TICKET_TTL_SEC }
  })

  app.get("/v1/stream", async (request, reply) => {
    const { ticket } = request.query as { ticket?: string }
    if (!ticket) {
      reply.code(401)
      return { message: "ticket query parameter required" }
    }
    const userId = await redis.getdel(keys.sseTicket(ticket))
    if (!userId) {
      reply.code(401)
      return { message: "Invalid or expired ticket" }
    }

    reply.hijack()
    const res = reply.raw
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    })

    const lastEventId = request.headers["last-event-id"] as string | undefined
    const backlog = await getBacklogSince(redis, userId, lastEventId)
    for (const evt of backlog) {
      res.write(`id: ${evt.id}\nevent: ${evt.event}\ndata: ${JSON.stringify(evt.data)}\n\n`)
    }

    const subscriber = redis.duplicate()
    await subscriber.subscribe(keys.pubsubUser(userId), keys.pubsubBroadcast())
    subscriber.on("message", (_channel, message) => {
      try {
        const evt: SseEvent = JSON.parse(message)
        res.write(`id: ${evt.id}\nevent: ${evt.event}\ndata: ${JSON.stringify(evt.data)}\n\n`)
      } catch (err) {
        logger.error(err, "failed to forward SSE message")
      }
    })

    const heartbeat = setInterval(() => res.write(": heartbeat\n\n"), 15_000)

    const cleanup = () => {
      clearInterval(heartbeat)
      subscriber.unsubscribe().catch(() => {})
      subscriber.disconnect()
    }
    request.raw.on("close", cleanup)
  })

  const kafkaClient = createKafka("notification-svc")
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
  logger.info(`notification-svc listening on :${PORT}`)
}

main().catch((err) => {
  logger.error(err, "notification-svc failed to start")
  process.exit(1)
})
