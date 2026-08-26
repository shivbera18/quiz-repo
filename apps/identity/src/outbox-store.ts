import type { PrismaClient } from "./generated/prisma/index.js"
import type { OutboxRow, OutboxStore } from "@quiz/kafka-kit"

// FOR UPDATE SKIP LOCKED, held for the duration of one transaction that spans
// claim -> Kafka send -> mark-published, so the lock actually protects against
// a second concurrent publisher claiming the same rows. markPublished is a
// closure bound to THIS transaction's client -- implementing it as a separate
// pool-client method would self-block on our own row locks every batch. See
// packages/kafka-kit/src/outbox.ts for the full contract.
export function createOutboxStore(prisma: PrismaClient): OutboxStore {
  return {
    async withClaimedBatch<T>(
      limit: number,
      fn: (rows: OutboxRow[], markPublished: (ids: Array<bigint | number>) => Promise<void>) => Promise<T>
    ): Promise<T> {
      return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<OutboxRow[]>`
          SELECT id, topic, key, payload, headers
          FROM "Outbox"
          WHERE "publishedAt" IS NULL
          ORDER BY id
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        `
        const markPublished = async (ids: Array<bigint | number>): Promise<void> => {
          if (ids.length === 0) return
          await tx.outbox.updateMany({
            where: { id: { in: ids.map((id) => BigInt(id)) } },
            data: { publishedAt: new Date() },
          })
        }
        return fn(rows, markPublished)
      })
    },
  }
}
