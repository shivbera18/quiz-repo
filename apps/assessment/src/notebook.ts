// Student notebook endpoints: list, manual bookmark add/remove, and Leitner
// practice outcomes. Wrong-answer capture itself happens inside
// submitAttempt()'s scoring transaction (attempt-service.ts) -- these routes
// only read/maintain what that capture produces plus user bookmarks.
import type { FastifyInstance } from "fastify"
import type { PrismaClient } from "./generated/prisma/index.js"
import { requireUser } from "./auth.js"
import { bookmarkCreateSchema, notebookOutcomeSchema, notebookListQuerySchema } from "@quiz/contracts"

// Leitner intervals (days) per box, 1-indexed: box N due after INTERVALS[N].
// Box 5 is the mastery shelf -- a week out, then monthly-ish via repeat.
const LEITNER_INTERVAL_DAYS: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 7, 5: 16 }
const WRONG_AGAIN_DELAY_MS = 10 * 60 * 1000

export function registerNotebookRoutes(app: FastifyInstance, prisma: PrismaClient) {
  app.get("/v1/notebook", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const parsed = notebookListQuerySchema.safeParse(request.query ?? {})
    if (!parsed.success) {
      reply.code(400)
      return { message: parsed.error.issues[0]?.message ?? "Invalid query" }
    }
    const { kind, due, limit } = parsed.data

    const where: Record<string, unknown> = { userId: user.userId }
    if (kind) where.kind = kind
    if (due === "true") where.nextPracticeAt = { lte: new Date() }

    const items = await prisma.notebookItem.findMany({
      where: where as any,
      orderBy: [{ nextPracticeAt: "asc" }, { createdAt: "desc" }],
      take: limit,
    })
    return { items }
  })

  app.post("/v1/notebook/bookmarks", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const parsed = bookmarkCreateSchema.safeParse(request.body ?? {})
    if (!parsed.success) {
      reply.code(400)
      return { message: parsed.error.issues[0]?.message ?? "Validation failed" }
    }
    const data = parsed.data
    try {
      const item = await prisma.notebookItem.upsert({
        where: {
          userId_questionId_kind: { userId: user.userId, questionId: data.questionId, kind: "BOOKMARK" },
        },
        // Re-bookmarking refreshes the frozen content but keeps Leitner state.
        update: {
          quizId: data.quizId,
          section: data.section,
          questionText: data.question,
          options: data.options as any,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation ?? "",
        },
        create: {
          userId: user.userId,
          questionId: data.questionId,
          kind: "BOOKMARK",
          quizId: data.quizId,
          section: data.section,
          questionText: data.question,
          options: data.options as any,
          correctAnswer: data.correctAnswer,
          explanation: data.explanation ?? "",
        },
      })
      return { item }
    } catch (err) {
      request.log.error(err)
      reply.code(500)
      return { message: "Internal server error" }
    }
  })

  app.delete("/v1/notebook/bookmarks/:questionId", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const { questionId } = request.params as { questionId: string }
    const deleted = await prisma.notebookItem.deleteMany({
      where: { userId: user.userId, questionId, kind: "BOOKMARK" },
    })
    if (deleted.count === 0) {
      reply.code(404)
      return { message: "Bookmark not found" }
    }
    return { deleted: true }
  })

  app.post("/v1/notebook/:id/outcome", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const { id } = request.params as { id: string }
    const parsed = notebookOutcomeSchema.safeParse(request.body ?? {})
    if (!parsed.success) {
      reply.code(400)
      return { message: parsed.error.issues[0]?.message ?? "correct (boolean) is required" }
    }

    const existing = await prisma.notebookItem.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.userId) {
      reply.code(404)
      return { message: "Notebook item not found" }
    }

    if (!parsed.data.correct) {
      const item = await prisma.notebookItem.update({
        where: { id },
        data: { boxLevel: 1, nextPracticeAt: new Date(Date.now() + WRONG_AGAIN_DELAY_MS), lastOutcome: "wrong" },
      })
      return { item }
    }

    const promotedBox = Math.min(existing.boxLevel + 1, 5)
    const intervalMs = (LEITNER_INTERVAL_DAYS[promotedBox] ?? 16) * 86_400_000
    const item = await prisma.notebookItem.update({
      where: { id },
      data: { boxLevel: promotedBox, nextPracticeAt: new Date(Date.now() + intervalMs), lastOutcome: "correct" },
    })
    return { item }
  })
}
