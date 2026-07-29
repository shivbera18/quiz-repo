// notification-svc's worker: dimension projections (UserRef) plus the
// two-stage push fan-out described in ARCHITECTURE.md. One
// announcement-published record never turns into N synchronous HTTP sends
// from a request thread (that was the actual bug at
// lib/push-notification-utils.ts:167-228) -- instead:
//   1. ANNOUNCEMENT_PUBLISHED -> broadcast over Redis pub/sub for SSE
//      (instant, no DB read needed) + page through PushSubscription 100 at a
//      time, producing one PUSH_SEND_REQUESTED record per subscription.
//   2. PUSH_SEND_REQUESTED -> actually calls the web-push API for that one
//      subscription.
// Both stages are handled by this one process/consumer group for now (the
// architecture's deployable count for notification-svc is api + one worker);
// they're logically distinct groups, not a single job.
import { randomUUID } from "node:crypto"
import { PrismaClient } from "./generated/prisma/index.js"
import { createLogger } from "@quiz/observability"
import { createKafka, runConsumer, getProducer, createEnvelope, TOPICS } from "@quiz/kafka-kit"
import { getRedisClient } from "@quiz/redis-kit"
import type { AnnouncementPublishedData, PushSendRequestedData, UserChangedData, UserErasureRequestedData } from "@quiz/contracts"
import { publishBroadcast } from "./sse.js"
import { sendPushToSubscription } from "./push.js"

const logger = createLogger("notification-fanout-worker")
const prisma = new PrismaClient()
const redis = getRedisClient()
const CONSUMER_GROUP = "notification-fanout-worker"
const FANOUT_PAGE_SIZE = 100

const processedEventStore = {
  async hasProcessed(eventId: string): Promise<boolean> {
    const row = await prisma.processedEvent.findUnique({ where: { eventId } })
    return row !== null
  },
}

async function markProcessed(eventId: string) {
  await prisma.processedEvent.create({ data: { eventId, consumerGroup: CONSUMER_GROUP } }).catch(() => null)
}

async function main() {
  const kafka = createKafka("notification-fanout-worker")
  const producer = await getProducer(kafka)

  await runConsumer<AnnouncementPublishedData | PushSendRequestedData | UserChangedData | UserErasureRequestedData>(kafka, {
    groupId: CONSUMER_GROUP,
    topics: [TOPICS.ANNOUNCEMENT_PUBLISHED, TOPICS.PUSH_SEND_REQUESTED, TOPICS.USER_CHANGED, TOPICS.USER_ERASURE_REQUESTED],
    store: processedEventStore,
    async onMessage({ envelope }) {
      switch (envelope.eventType) {
        case TOPICS.ANNOUNCEMENT_PUBLISHED: {
          const data = envelope.data as AnnouncementPublishedData

          await publishBroadcast(redis, "announcement", {
            id: data.announcementId,
            title: data.title,
            content: data.content,
            priority: data.priority,
          })

          let cursor: string | undefined
          let paged = 0
          for (;;) {
            const subs = await prisma.pushSubscription.findMany({
              where: { isActive: true },
              orderBy: { id: "asc" },
              take: FANOUT_PAGE_SIZE,
              ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
            })
            if (subs.length === 0) break

            await producer.sendBatch({
              topicMessages: [
                {
                  topic: TOPICS.PUSH_SEND_REQUESTED,
                  messages: subs.map((sub) => {
                    const payload: PushSendRequestedData = {
                      requestId: randomUUID(),
                      announcementId: data.announcementId,
                      userId: sub.userId,
                      subscriptionId: sub.id,
                      payload: {
                        title: data.title,
                        body: data.content.length > 100 ? data.content.slice(0, 100) + "..." : data.content,
                        url: "/dashboard",
                        tag: `announcement-${data.announcementId}`,
                        priority: data.priority,
                      },
                      dedupeKey: `${data.announcementId}:${sub.id}`,
                    }
                    return {
                      key: sub.userId,
                      value: JSON.stringify(createEnvelope(TOPICS.PUSH_SEND_REQUESTED, payload, { producer: "notification-fanout-worker" })),
                    }
                  }),
                },
              ],
            })

            paged += subs.length
            cursor = subs[subs.length - 1].id
            if (subs.length < FANOUT_PAGE_SIZE) break
          }

          logger.info({ announcementId: data.announcementId, subscriptionsPaged: paged }, "announcement fanned out")
          await markProcessed(envelope.eventId)
          return
        }

        case TOPICS.PUSH_SEND_REQUESTED: {
          const data = envelope.data as PushSendRequestedData
          const result = await sendPushToSubscription(prisma, data.subscriptionId, data.payload)
          if (!result.sent) {
            logger.warn({ subscriptionId: data.subscriptionId, reason: result.reason }, "push not sent")
          }
          await markProcessed(envelope.eventId)
          return
        }

        case TOPICS.USER_CHANGED: {
          const data = envelope.data as UserChangedData
          await prisma.userRef.upsert({
            where: { userId: data.userId },
            update: { email: data.email, name: data.name },
            create: { userId: data.userId, email: data.email, name: data.name },
          })
          await markProcessed(envelope.eventId)
          return
        }

        case TOPICS.USER_ERASURE_REQUESTED: {
          const data = envelope.data as UserErasureRequestedData
          // Unlike analytics-svc's historical facts, push subscription
          // endpoints/keys ARE live secrets with no reason to be retained
          // past an erasure request -- hard delete, not redact.
          await prisma.pushSubscription.deleteMany({ where: { userId: data.userId } })
          await prisma.userRef.deleteMany({ where: { userId: data.userId } })
          await markProcessed(envelope.eventId)
          return
        }

        default:
          logger.warn({ eventType: envelope.eventType }, "unhandled event type")
      }
    },
  })

  logger.info("notification-fanout-worker running")
}

main().catch((err) => {
  logger.error(err, "notification-fanout-worker failed to start")
  process.exit(1)
})
