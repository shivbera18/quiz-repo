// Pages active subscriptions into per-subscription push jobs so announcement
// requests never wait on external browser push services.
import { PrismaClient } from "./generated/prisma/index.js"
import { createLogger, ensureDatabaseUrl } from "@quiz/observability"
import { createKafka, runConsumer, getProducer, createEnvelope, TOPICS, isKafkaDisabled } from "@quiz/kafka-kit"
import { getRedisClient } from "@quiz/redis-kit"
import type { AnnouncementPublishedData, PushSendRequestedData, UserChangedData, UserErasureRequestedData } from "@quiz/contracts"
import { publishBroadcast } from "./sse.js"
import { sendPushToSubscription } from "./push.js"

const logger = createLogger("notification-fanout-worker")
ensureDatabaseUrl("notification")
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
  await prisma.processedEvent.create({ data: { eventId, consumerGroup: CONSUMER_GROUP } }).catch((err: { code?: string }) => {
    if (err.code !== "P2002") throw err
  })
}

async function main() {
  if (isKafkaDisabled()) {
    logger.warn("Kafka disabled - notification-fanout-worker idle (announcements/push will not fan out)")
    await new Promise(() => {})
    return
  }
  const kafka = createKafka("notification-fanout-worker")
  const producer = await getProducer(kafka)

  const consumer = await runConsumer<AnnouncementPublishedData | PushSendRequestedData | UserChangedData | UserErasureRequestedData>(kafka, {
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
          try {
            const result = await sendPushToSubscription(prisma, data.subscriptionId, data.payload)
            if (!result.sent) {
              logger.warn({ announcementId: data.announcementId, subscriptionId: data.subscriptionId, reason: result.reason }, "push not sent")
            }
          } catch (err) {
            logger.error({ err, announcementId: data.announcementId, subscriptionId: data.subscriptionId }, "push delivery failed")
            throw err
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

  const close = async () => {
    await consumer.disconnect()
    await producer.disconnect()
    redis.disconnect()
    await prisma.$disconnect()
  }
  process.on("SIGTERM", close)
  process.on("SIGINT", close)
}

main().catch((err) => {
  logger.error(err, "notification-fanout-worker failed to start")
  process.exit(1)
})
