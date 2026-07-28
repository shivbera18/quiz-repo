import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/attempt-auth"

export const dynamic = "force-dynamic"

interface AnswerInput {
  questionId: string
  section: string
  selectedAnswer: number | null
  markedForReview?: boolean
  visited?: boolean
  timeSpentMs?: number
  clientSeq?: number
}

export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const user = await requireUser(request)
    const body = await request.json()
    const answers: AnswerInput[] = Array.isArray(body.answers) ? body.answers : []

    if (answers.length === 0) {
      return NextResponse.json({ message: "answers must be a non-empty array" }, { status: 400 })
    }

    const attempt = await prisma.attempt.findUnique({ where: { id: params.id } })
    if (!attempt || attempt.userId !== user.userId) {
      return NextResponse.json({ message: "Attempt not found" }, { status: 404 })
    }

    if (attempt.status !== "IN_PROGRESS") {
      return NextResponse.json({ message: `Attempt is ${attempt.status.toLowerCase()}, cannot autosave` }, { status: 409 })
    }

    if (attempt.expiresAt <= new Date()) {
      await prisma.attempt.update({ where: { id: attempt.id }, data: { status: "EXPIRED" } })
      return NextResponse.json({ message: "Attempt has expired" }, { status: 409 })
    }

    for (const answer of answers) {
      const clientSeq = BigInt(answer.clientSeq ?? 0)
      const existing = await prisma.attemptAnswer.findUnique({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: answer.questionId } },
      })

      if (existing && existing.clientSeq > clientSeq) {
        continue // stale write from an older tab/request; last-write-wins keeps the newer one
      }

      await prisma.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: answer.questionId } },
        update: {
          selectedOption: answer.selectedAnswer,
          markedForReview: answer.markedForReview ?? existing?.markedForReview ?? false,
          visited: answer.visited ?? existing?.visited ?? true,
          timeSpentMs: answer.timeSpentMs ?? existing?.timeSpentMs ?? 0,
          answeredAt: answer.selectedAnswer !== null ? new Date() : existing?.answeredAt ?? null,
          clientSeq,
        },
        create: {
          attemptId: attempt.id,
          questionId: answer.questionId,
          section: answer.section,
          selectedOption: answer.selectedAnswer,
          markedForReview: answer.markedForReview ?? false,
          visited: answer.visited ?? true,
          timeSpentMs: answer.timeSpentMs ?? 0,
          answeredAt: answer.selectedAnswer !== null ? new Date() : null,
          clientSeq,
        },
      })
    }

    return NextResponse.json({ saved: answers.length })
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.includes("token") || error.message === "User not found")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    console.error("Error autosaving answers:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
