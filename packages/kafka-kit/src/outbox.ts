import type { Producer } from "kafkajs"

// Generic outbox publisher: each service writes to its own `outbox` table in
// the SAME transaction as the business write (e.g. Attempt status flip +
// Outbox row insert, one commit), then a poller calls this to actually publish
// to Kafka and mark rows published. This is what makes "DB write + event" atomic
// without a two-phase commit or Kafka transactions (see ARCHITECTURE.md's
// "cargo-cult audit" for why Kafka transactions/EOS were rejected).
export interface OutboxRow {
  id: bigint | number
  topic: string
  key: string
  payload: unknown
  headers: unknown
}

// Deliberately ONE method, not separate claim()/markPublished() calls: the
// `FOR UPDATE SKIP LOCKED` claim only means something if the row lock is held
// until the rows are marked published, which requires claim + mark to run
// inside the same database transaction. Two separate auto-committed calls
// would release the lock right after the SELECT, so a second concurrent
// publisher instance could claim the same "unpublished" rows before the first
// one finishes sending them to Kafka -- the exact race this pattern exists to
// prevent.
//
// markPublished is handed TO the callback rather than being a sibling store
// method for a subtle but critical reason: the callback body runs INSIDE the
// store's open interactive transaction, and a store-implemented
// `markPublished(ids)` method would have no way to receive that transaction's
// client -- it would execute on the connection pool OUTSIDE the transaction,
// block on the claim's own FOR UPDATE row locks, and deadlock every batch
// until Prisma kills the interactive transaction on its timeout. Passing a
// closure bound to the transaction client makes the "hold the lock until
// marked" invariant structurally unbreakable by an implementation mistake.
// The Kafka send happens between the two halves of the callback, inside the
// open transaction; that holds the transaction open for the duration of one
// small batch's publish (bounded by Kafka ack latency), which is an accepted
// trade for correctness at this scale (one publisher instance per service in
// this build; the pattern still holds if scaled out later).
export interface OutboxStore {
  withClaimedBatch: <T>(
    limit: number,
    fn: (rows: OutboxRow[], markPublished: (ids: Array<bigint | number>) => Promise<void>) => Promise<T>
  ) => Promise<T>
}

export async function publishOutboxBatch(producer: Producer, store: OutboxStore, batchSize = 100): Promise<number> {
  try {
    return await store.withClaimedBatch(batchSize, async (rows, markPublished) => {
      if (rows.length === 0) return 0

      await producer.sendBatch({
        topicMessages: rows.map((row) => ({
          topic: row.topic,
          messages: [
            {
              key: row.key,
              value: row.payload === null ? null : JSON.stringify(row.payload),
              headers: (row.headers ?? {}) as Record<string, string>,
            },
          ],
        })),
      })

      await markPublished(rows.map((r) => r.id))
      return rows.length
    })
  } catch (err: any) {
    // If database schema / Outbox relation does not exist yet (pre-migration), do not throw unhandled error
    if (err?.code === "P2010" || err?.meta?.code === "42P01" || String(err).includes("relation \"Outbox\" does not exist")) {
      return 0
    }
    throw err
  }
}

export function startOutboxPublisher(producer: Producer, store: OutboxStore, intervalMs = 2000) {
  const timer = setInterval(() => {
    publishOutboxBatch(producer, store).catch((err) => console.error("[outbox] publish batch failed:", err))
  }, intervalMs)
  return () => clearInterval(timer)
}
