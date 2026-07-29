import type { PrismaClient } from "./generated/prisma/index.js"
import type { OutboxRow, OutboxStore } from "@quiz/kafka-kit"

// Same withClaimedBatch-in-one-transaction pattern as every other service's
// outbox-store.ts -- see packages/kafka-kit/src/outbox.ts.
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
