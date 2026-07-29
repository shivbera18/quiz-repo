import type { PrismaClient } from "./generated/prisma/index.js"
import type { OutboxRow, OutboxStore } from "@quiz/kafka-kit"

// FOR UPDATE SKIP LOCKED, held for the duration of one transaction that spans
// claim -> Kafka send -> markPublished, so the lock actually protects against
// a second concurrent publisher claiming the same rows. See the long comment
// in packages/kafka-kit/src/outbox.ts for why this can't be two separate calls.
export function createOutboxStore(prisma: PrismaClient): OutboxStore {
  return {
    async withClaimedBatch<T>(limit: number, fn: (rows: OutboxRow[]) => Promise<T>): Promise<T> {
      return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<OutboxRow[]>`
          SELECT id, topic, key, payload, headers
          FROM "Outbox"
          WHERE "publishedAt" IS NULL
          ORDER BY id
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        `
        return fn(rows)
      })
    },
    async markPublished(ids: Array<bigint | number>): Promise<void> {
      if (ids.length === 0) return
      await prisma.outbox.updateMany({
        where: { id: { in: ids.map((id) => BigInt(id)) } },
        data: { publishedAt: new Date() },
      })
    },
  }
}
