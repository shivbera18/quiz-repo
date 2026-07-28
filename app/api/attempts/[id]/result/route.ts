import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/attempt-auth"
import { formatAttemptResult, type SnapshotQuestionWithKey } from "@/lib/attempt-result"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const user = await requireUser(request)

    const attempt = await prisma.attempt.findUnique({ where: { id: params.id } })
    if (!attempt || attempt.userId !== user.userId) {
      return NextResponse.json({ message: "Result not found" }, { status: 404 })
    }

    if (attempt.status !== "SUBMITTED") {
      return NextResponse.json({ message: `Attempt is ${attempt.status.toLowerCase()}, not yet submitted` }, { status: 409 })
    }

    const [snapshot, attemptAnswers, quiz] = await Promise.all([
      prisma.attemptSnapshot.findUniqueOrThrow({ where: { id: attempt.snapshotId } }),
      prisma.attemptAnswer.findMany({ where: { attemptId: attempt.id } }),
      prisma.quiz.findUnique({ where: { id: attempt.quizId }, select: { title: true } }),
    ])

    const result = formatAttemptResult(
      attempt,
      quiz?.title ?? "Quiz",
      snapshot.questions as unknown as SnapshotQuestionWithKey[],
      attemptAnswers
    )

    const response = NextResponse.json({ result })
    response.headers.set("Cache-Control", "private, no-store")
    return response
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.includes("token") || error.message === "User not found")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    console.error("Error fetching attempt result:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
