import type { Consumer, EachMessagePayload, Kafka, Producer } from "kafkajs"
import type { EventEnvelope } from "@quiz/contracts"
import { getProducer } from "./client.js"

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

export interface DlqOptions {
  // Dead-lettering can be disabled entirely (messages then fall back to the
  // pre-DLQ behavior: log-and-drop for parse failures, rethrow-for-redelivery
  // for handler failures).
  enabled?: boolean
  // Total attempts per message = 1 + maxRetries. Retries are in-process with
  // exponential backoff; only after they are exhausted is the message
  // dead-lettered. This keeps transient failures (a database blip, a brief
  // downstream outage) from permanently parking good messages.
  maxRetries?: number
  retryBackoffMs?: number
}

const DEFAULT_DLQ: Required<DlqOptions> = { enabled: true, maxRetries: 3, retryBackoffMs: 500 }

export type MessageOutcome =
  | "skipped-tombstone"
  | "skipped-duplicate"
  | "processed"
  | "dead-lettered-parse-error"
  | "dead-lettered-handler-error"
  | "dropped-parse-error"

function backoffDelay(retryBackoffMs: number, failedAttempts: number): number {
  // 1st retry waits backoffMs, 2nd 2x, capped at 5s so a poison message's
  // total in-process retry window stays bounded (~3.5s at defaults).
  return Math.min(retryBackoffMs * 2 ** (failedAttempts - 1), 5_000)
}

/**
 * Processes one Kafka message with the full failure policy:
 *
 *  - tombstones / empty values are skipped (compacted-topic deletes),
 *  - unparseable values go straight to the DLQ (retrying a permanently
 *    malformed value can never succeed) -- or are dropped if DLQ is off,
 *  - duplicates per ProcessedEventStore are skipped,
 *  - handler errors are retried in-process with backoff, then dead-lettered;
 *    if the DLQ publish ITSELF fails, the original handler error is rethrown
 *    so Kafka's normal redelivery machinery still applies (we never want a
 *    DLQ outage to cause message loss).
 *
 * Extracted from runConsumer so the failure policy is unit-testable without
 * a broker.
 */
export async function processMessage<T>(
  payload: EachMessagePayload,
  args: {
    groupId: string
    store: ProcessedEventStore
    onMessage: (ctx: ConsumerHandlerContext<T>) => Promise<void>
    dlq: Required<DlqOptions>
    // key/value are deliberately `unknown`: kafkajs bundles its own
    // @types/node, so this package's Buffer/Uint8Array and kafkajs' are
    // unrelated declarations to the type checker despite being structurally
    // identical at runtime. The DLQ writer just forwards opaque bytes.
    produceToDlq: ((record: { topic: string; key: unknown; value: unknown; headers: Record<string, string> }) => Promise<void>) | null
  }
): Promise<MessageOutcome> {
  const { message, topic, partition } = payload
  if (!message.value) return "skipped-tombstone"

  const dlqHeaders = (errorMessage: string, attempts: number): Record<string, string> => ({
    ...Object.fromEntries(Object.entries(message.headers ?? {}).map(([k, v]) => [k, v == null ? "" : v.toString()])),
    "dlq-original-topic": topic,
    "dlq-original-partition": String(partition),
    "dlq-original-offset": String(message.offset),
    "dlq-error": errorMessage.slice(0, 800),
    "dlq-failed-at": new Date().toISOString(),
  })

  let envelope: EventEnvelope<T>
  try {
    envelope = JSON.parse(message.value.toString())
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    if (args.dlq.enabled && args.produceToDlq) {
      try {
        await args.produceToDlq({
          topic: `${topic}.dlq`,
          key: message.key ?? null,
          value: message.value,
          headers: dlqHeaders(errorMessage, 1),
        })
        console.error(`[${args.groupId}] unparsable message on ${topic}[${partition}]@${message.offset} dead-lettered to ${topic}.dlq:`, errorMessage)
        return "dead-lettered-parse-error"
      } catch (dlqErr) {
        // A garbage value we cannot park anywhere: dropping it (with a loud
        // log) beats crash-looping the whole consumer group over one record.
        console.error(`[${args.groupId}] DLQ publish FAILED for unparsable message on ${topic}[${partition}]@${message.offset}; DROPPING. dlq-error:`, dlqErr, "parse-error:", err)
        return "dropped-parse-error"
      }
    }
    console.error(`[${args.groupId}] failed to parse message on ${topic}[${partition}]@${message.offset} and DLQ disabled; dropping:`, err)
    return "dropped-parse-error"
  }

  const alreadyProcessed = await args.store.hasProcessed(envelope.eventId)
  if (alreadyProcessed) return "skipped-duplicate"

  let lastHandlerError: unknown
  for (let attempt = 1; attempt <= 1 + args.dlq.maxRetries; attempt++) {
    try {
      await args.onMessage({ envelope, raw: payload })
      return "processed"
    } catch (err) {
      lastHandlerError = err
      if (attempt <= args.dlq.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, backoffDelay(args.dlq.retryBackoffMs, attempt)))
      }
    }
  }

  const errorMessage = lastHandlerError instanceof Error ? lastHandlerError.message : String(lastHandlerError)
  console.error(
    `[${args.groupId}] handler failed ${1 + args.dlq.maxRetries}x for eventId=${envelope.eventId} eventType=${envelope.eventType} on ${topic}[${partition}]@${message.offset}:`,
    errorMessage
  )

  if (args.dlq.enabled && args.produceToDlq) {
    try {
      await args.produceToDlq({
        topic: `${topic}.dlq`,
        key: message.key ?? null,
        value: message.value,
        headers: dlqHeaders(errorMessage, 1 + args.dlq.maxRetries),
      })
      return "dead-lettered-handler-error"
    } catch (dlqErr) {
      console.error(`[${args.groupId}] DLQ publish FAILED for eventId=${envelope.eventId}; rethrowing so Kafka redelivers:`, dlqErr)
    }
  }

  throw lastHandlerError
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
    dlq?: DlqOptions
  }
): Promise<Consumer> {
  const dlq: Required<DlqOptions> = { ...DEFAULT_DLQ, ...(opts.dlq ?? {}) }

  const consumer = kafka.consumer({
    groupId: opts.groupId,
    maxWaitTimeInMs: 500,
    ...(opts.maxPollIntervalMs ? { maxPollIntervalMs: opts.maxPollIntervalMs } : {}),
  })
  await consumer.connect()
  await Promise.all(opts.topics.map((topic) => consumer.subscribe({ topic, fromBeginning: true })))

  // Lazily connected shared producer used only when a message must be parked.
  // null when DLQ is disabled -- processMessage treats null produce as "no DLQ".
  let dlqProducer: Producer | null = null
  if (dlq.enabled) {
    dlqProducer = await getProducer(kafka)
  }

  await consumer.run({
    eachMessage: async (payload) => {
      await processMessage(payload, {
        groupId: opts.groupId,
        store: opts.store,
        onMessage: opts.onMessage,
        dlq,
        produceToDlq: dlqProducer
          ? async (record) => {
              await dlqProducer!.send({
                topic: record.topic,
                // Boundary cast for the duplicate @types/node copies -- see the
                // unknown-bytes note on processMessage's signature.
                messages: [{ key: record.key as never, value: record.value as never, headers: record.headers }],
              })
            }
          : null,
      })
    },
  })

  return consumer
}
