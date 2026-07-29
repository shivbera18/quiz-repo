import type { Consumer, Kafka, EachMessagePayload } from "kafkajs"
import type { EventEnvelope } from "@quiz/contracts"

// Consumer-side idempotency: each service keeps its own `processed_event(event_id,
// consumer_group, processed_at)` table and checks/inserts it in the SAME
// transaction as the projection upsert it guards. That's what actually makes
// replay-to-rebuild safe -- resetting the consumer group to offset 0 replays
// every record, and this table is what stops them being double-applied.
export interface ProcessedEventStore {
  hasProcessed: (eventId: string) => Promise<boolean>
}

export interface ConsumerHandlerContext<T> {
  envelope: EventEnvelope<T>
  raw: EachMessagePayload
}

export async function runConsumer<T>(
  kafka: Kafka,
  opts: {
    groupId: string
    topics: string[]
    store: ProcessedEventStore
    onMessage: (ctx: ConsumerHandlerContext<T>) => Promise<void>
    // See ARCHITECTURE.md's ai-generation-requested note: a consumer that pauses
    // work for longer than the default 300s poll interval gets evicted from its
    // group mid-job, triggering a rebalance and a duplicate. Callers with
    // long-running handlers should raise this.
    maxPollIntervalMs?: number
  }
): Promise<Consumer> {
  const consumer = kafka.consumer({
    groupId: opts.groupId,
    maxWaitTimeInMs: 500,
  })
  await consumer.connect()
  await Promise.all(opts.topics.map((topic) => consumer.subscribe({ topic, fromBeginning: true })))

  await consumer.run({
    eachMessage: async (payload) => {
      const { message } = payload
      if (!message.value) return

      let envelope: EventEnvelope<T>
      try {
        envelope = JSON.parse(message.value.toString())
      } catch (err) {
        console.error(`[${opts.groupId}] failed to parse message, sending to DLQ path:`, err)
        return
      }

      const alreadyProcessed = await opts.store.hasProcessed(envelope.eventId)
      if (alreadyProcessed) return

      await opts.onMessage({ envelope, raw: payload })
    },
  })

  return consumer
}
