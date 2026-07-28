import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/lib/attempt-auth"
import { scoreQuiz, type ScoringQuestion } from "@/lib/scoring"
import { formatAttemptResult, type SnapshotQuestionWithKey } from "@/lib/attempt-result"

export const dynamic = "force-dynamic"

const VALID_SUBMIT_SOURCES = new Set(["user", "timer", "sweeper"])

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params
  try {
    const user = await requireUser(request)
    const body = await request.json().catch(() => ({}))
    const submitSource = VALID_SUBMIT_SOURCES.has(body?.submitSource) ? body.submitSource : "user"

    const attempt = await prisma.attempt.findUnique({ where: { id: params.id } })
    if (!attempt || attempt.userId !== user.userId) {
      return NextResponse.json({ message: "Attempt not found" }, { status: 404 })
    }

    // Postgres compare-and-swap: the database, not this request, is the arbiter of
    // whether a submit "wins". A second concurrent submit (double-click, retry after
    // a dropped response) sees count 0 and replays the already-computed result below
    // instead of re-scoring.
    const cas = await prisma.attempt.updateMany({
      where: { id: attempt.id, status: "IN_PROGRESS" },
      data: { status: "SUBMITTED", submittedAt: new Date() },
    })

    const quiz = await prisma.quiz.findUnique({ where: { id: attempt.quizId }, select: { title: true } })
    const quizTitle = quiz?.title ?? "Quiz"

    if (cas.count === 0) {
      const current = await prisma.attempt.findUniqueOrThrow({ where: { id: attempt.id } })
      if (current.status !== "SUBMITTED") {
        return NextResponse.json({ message: `Attempt is ${current.status.toLowerCase()}, cannot submit` }, { status: 409 })
      }
      const [snapshot, attemptAnswers] = await Promise.all([
        prisma.attemptSnapshot.findUniqueOrThrow({ where: { id: current.snapshotId } }),
        prisma.attemptAnswer.findMany({ where: { attemptId: current.id } }),
      ])
      return NextResponse.json(
        formatAttemptResult(current, quizTitle, snapshot.questions as unknown as SnapshotQuestionWithKey[], attemptAnswers)
      )
    }

    const [snapshot, attemptAnswers] = await Promise.all([
      prisma.attemptSnapshot.findUniqueOrThrow({ where: { id: attempt.snapshotId } }),
      prisma.attemptAnswer.findMany({ where: { attemptId: attempt.id } }),
    ])
    const snapshotQuestions = snapshot.questions as unknown as SnapshotQuestionWithKey[]

    const scoringQuestions: ScoringQuestion[] = snapshotQuestions.map((q) => ({
      id: q.id,
      section: q.section,
      correctAnswer: q.correctAnswer,
      question: q.question,
      options: q.options,
      explanation: q.explanation,
      image: q.image,
    }))
    const scoringAnswers = attemptAnswers.map((a) => ({ questionId: a.questionId, selectedAnswer: a.selectedOption }))
    const questionTimes = Object.fromEntries(attemptAnswers.map((a) => [a.questionId, a.timeSpentMs]))

    const scored = scoreQuiz(scoringQuestions, scoringAnswers, {
      negativeMarking: attempt.negativeMarking,
      negativeMarkValue: attempt.negativeMarkValue,
      questionTimes,
    })

    const submittedAt = new Date()
    const updatedAttempt = await prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        submittedAt,
        submitSource,
        rawScore: scored.rawScore,
        totalScore: scored.totalScore,
        maxScore: scoringQuestions.length,
        correctCount: scored.correctAnswers,
        wrongCount: scored.wrongAnswers,
        unansweredCount: scored.unanswered,
        timeSpentMs: submittedAt.getTime() - attempt.startedAt.getTime(),
      },
    })

    await Promise.all(
      scored.questionResults.map((qr) =>
        prisma.attemptAnswer.upsert({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: qr.questionId } },
          update: { isCorrect: qr.isCorrect, awarded: qr.isCorrect ? 1 : qr.isUnanswered ? 0 : attempt.negativeMarking ? -attempt.negativeMarkValue : 0 },
          create: {
            attemptId: attempt.id,
            questionId: qr.questionId,
            section: qr.section,
            selectedOption: qr.selectedAnswer,
            isCorrect: qr.isCorrect,
            awarded: qr.isCorrect ? 1 : qr.isUnanswered ? 0 : attempt.negativeMarking ? -attempt.negativeMarkValue : 0,
          },
        })
      )
    )

    const finalAnswers = await prisma.attemptAnswer.findMany({ where: { attemptId: attempt.id } })
    return NextResponse.json(formatAttemptResult(updatedAttempt, quizTitle, snapshotQuestions, finalAnswers))
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.includes("token") || error.message === "User not found")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    console.error("Error submitting attempt:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
