import { createHash } from "crypto"
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/lib/generated/prisma"
import { parseJsonField } from "@/lib/database-utils"
import { requireUser } from "@/lib/attempt-auth"

export const dynamic = "force-dynamic"

interface SnapshotQuestion {
  id: string
  section: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  image?: string
}

function canonicalQuestionsJson(questions: SnapshotQuestion[]): string {
  // Stable stringify (sorted keys) so the same question set always hashes the same,
  // regardless of property insertion order.
  return JSON.stringify(
    questions.map((q) => ({
      id: q.id,
      section: q.section,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation ?? "",
      image: q.image ?? "",
    }))
  )
}

function stripAnswerKey(questions: SnapshotQuestion[]) {
  return questions.map(({ id, section, question, options, image }) => ({
    id,
    section,
    question,
    options,
    image,
  }))
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request)
    const body = await request.json()
    const { quizId, clientIdemKey } = body

    if (!quizId || typeof quizId !== "string") {
      return NextResponse.json({ message: "quizId is required" }, { status: 400 })
    }

    const now = new Date()

    const quiz = await prisma.quiz.findUnique({ where: { id: quizId } })
    if (!quiz) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 })
    }

    // Resume an existing, still-valid in-progress attempt rather than starting a
    // second one -- this is also what the attempt_one_inflight partial unique
    // index enforces at the database level.
    const existing = await prisma.attempt.findFirst({
      where: { userId: user.userId, quizId, status: "IN_PROGRESS" },
    })

    if (existing) {
      if (existing.expiresAt > now) {
        const [snapshot, savedAnswers] = await Promise.all([
          prisma.attemptSnapshot.findUniqueOrThrow({ where: { id: existing.snapshotId } }),
          prisma.attemptAnswer.findMany({ where: { attemptId: existing.id } }),
        ])
        const questions = stripAnswerKey(parseJsonField(snapshot.questions))
        return NextResponse.json({
          attemptId: existing.id,
          quizId: existing.quizId,
          quizTitle: quiz.title,
          resumed: true,
          startedAt: existing.startedAt,
          expiresAt: existing.expiresAt,
          serverTime: now,
          remainingMs: Math.max(0, existing.expiresAt.getTime() - now.getTime()),
          timeLimitSec: snapshot.timeLimitSec,
          negativeMarking: existing.negativeMarking,
          negativeMarkValue: existing.negativeMarkValue,
          sections: parseJsonField(snapshot.sections),
          questions,
          savedAnswers: savedAnswers.map((a) => ({
            questionId: a.questionId,
            selectedAnswer: a.selectedOption,
            markedForReview: a.markedForReview,
            visited: a.visited,
            timeSpentMs: a.timeSpentMs,
            clientSeq: Number(a.clientSeq),
          })),
        })
      }

      // Expired but never swept -- transition it out of the way before starting a new one.
      await prisma.attempt.update({ where: { id: existing.id }, data: { status: "EXPIRED" } })
    }

    if (!quiz.isActive) {
      return NextResponse.json({ message: "This quiz is not active" }, { status: 403 })
    }

    const parsedQuestions = parseJsonField(quiz.questions) as SnapshotQuestion[]
    const parsedSections = parseJsonField(quiz.sections)
    const contentHash = createHash("sha256").update(canonicalQuestionsJson(parsedQuestions)).digest("hex")

    let snapshot = await prisma.attemptSnapshot.findUnique({
      where: { quizId_contentHash: { quizId, contentHash } },
    })
    if (!snapshot) {
      snapshot = await prisma.attemptSnapshot.create({
        data: {
          quizId,
          contentHash,
          timeLimitSec: quiz.timeLimit * 60,
          negativeMarking: quiz.negativeMarking,
          negativeMarkValue: quiz.negativeMarkValue,
          sections: parsedSections,
          questions: parsedQuestions as unknown as Prisma.InputJsonValue,
        },
      })
    }

    const expiresAt = new Date(now.getTime() + snapshot.timeLimitSec * 1000)

    const attempt = await prisma.attempt.create({
      data: {
        quizId,
        userId: user.userId,
        userName: user.name,
        userEmail: user.email,
        snapshotId: snapshot.id,
        startedAt: now,
        expiresAt,
        negativeMarking: quiz.negativeMarking,
        negativeMarkValue: quiz.negativeMarkValue,
        clientIdemKey: clientIdemKey || null,
      },
    })

    return NextResponse.json(
      {
        attemptId: attempt.id,
        quizId,
        quizTitle: quiz.title,
        resumed: false,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        serverTime: now,
        remainingMs: snapshot.timeLimitSec * 1000,
        timeLimitSec: snapshot.timeLimitSec,
        negativeMarking: quiz.negativeMarking,
        negativeMarkValue: quiz.negativeMarkValue,
        sections: parsedSections,
        questions: stripAnswerKey(parsedQuestions),
        savedAnswers: [],
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && (error.message === "Unauthorized" || error.message.includes("token") || error.message === "User not found")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    // A concurrent double-click can race past the findFirst check above; the
    // database's partial unique index (attempt_one_inflight) is the real guard.
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json({ message: "An attempt is already in progress for this quiz" }, { status: 409 })
    }
    console.error("Error starting attempt:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
