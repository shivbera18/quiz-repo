// Core Attempt logic, factored out of the HTTP layer so both index.ts (the
// API) and worker.ts (the expiry sweeper) can call submitAttempt() without
// duplicating the scoring/transaction/outbox-write logic. The monolith never
// needed this split since it had no worker process.
//
// Ported from apps/web/app/api/attempts/{route,[id]/answers/route,[id]/submit/route,[id]/result/route}.ts
// with one architectural change beyond the service split: attempt-submitted
// now writes to the Outbox in the SAME transaction as the score/answers write
// (the monolith had no event to publish). chapterId/subjectId on the emitted
// event are left null -- this service has no notion of quiz->chapter/subject
// (that's catalog-svc's ownership), so analytics-svc's rollup consumer
// resolves them itself via its own dim_quiz projection (kept current by
// quiz-changed events) rather than trusting a value assessment-svc would
// have to look up cross-service on every submit.
import { createHash } from "node:crypto"
import type { PrismaClient, Attempt } from "./generated/prisma/index.js"
import { createEnvelope, TOPICS } from "@quiz/kafka-kit"
import type { AttemptStartedData, AttemptSubmittedData, AutosaveAnswer } from "@quiz/contracts"
import { fetchFullQuiz } from "./catalog-client.js"
import { scoreQuiz, type ScoringQuestion } from "./lib/scoring.js"
import { formatAttemptResult, type SnapshotQuestionWithKey } from "./attempt-result.js"

export class NotFoundError extends Error {}
export class ForbiddenError extends Error {}
export class ConflictError extends Error {}

interface AuthedUser {
  userId: string
  name: string
  email: string
}

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
  // Stable stringify (sorted keys) so the same question set always hashes the
  // same regardless of property insertion order.
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
  return questions.map(({ id, section, question, options, image }) => ({ id, section, question, options, image }))
}

export async function startOrResumeAttempt(
  prisma: PrismaClient,
  user: AuthedUser,
  quizId: string,
  clientIdemKey: string | undefined
) {
  const now = new Date()
  const quiz = await fetchFullQuiz(quizId)
  if (!quiz) throw new NotFoundError("Quiz not found")

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
      const questions = stripAnswerKey(snapshot.questions as unknown as SnapshotQuestion[])
      return {
        attemptId: existing.id,
        quizId: existing.quizId,
        quizTitle: snapshot.quizTitle,
        resumed: true,
        startedAt: existing.startedAt,
        expiresAt: existing.expiresAt,
        serverTime: now,
        remainingMs: Math.max(0, existing.expiresAt.getTime() - now.getTime()),
        timeLimitSec: snapshot.timeLimitSec,
        negativeMarking: existing.negativeMarking,
        negativeMarkValue: existing.negativeMarkValue,
        sections: snapshot.sections as unknown as string[],
        questions,
        savedAnswers: savedAnswers.map((a) => ({
          questionId: a.questionId,
          selectedAnswer: a.selectedOption,
          markedForReview: a.markedForReview,
          visited: a.visited,
          timeSpentMs: a.timeSpentMs,
          clientSeq: Number(a.clientSeq),
        })),
      }
    }

    // Expired but never swept -- transition it out of the way before starting a
    // new one. Conditional on status so a submit that won the CAS between our
    // findFirst and this write cannot be clobbered from SUBMITTED back to
    // EXPIRED (which would make its computed score permanently inaccessible,
    // since getResult serves SUBMITTED attempts only).
    await prisma.attempt.updateMany({
      where: { id: existing.id, status: "IN_PROGRESS" },
      data: { status: "EXPIRED" },
    })
  }

  if (!quiz.isActive) throw new ForbiddenError("This quiz is not active")

  const contentHash = createHash("sha256").update(canonicalQuestionsJson(quiz.questions)).digest("hex")

  let snapshot = await prisma.attemptSnapshot.findUnique({
    where: { quizId_contentHash: { quizId, contentHash } },
  })
  if (!snapshot) {
    snapshot = await prisma.attemptSnapshot.create({
      data: {
        quizId,
        quizTitle: quiz.title,
        quizVersion: quiz.version,
        contentHash,
        timeLimitSec: quiz.timeLimitSec,
        negativeMarking: quiz.negativeMarking,
        negativeMarkValue: quiz.negativeMarkValue,
        sections: quiz.sections as any,
        questions: quiz.questions as any,
      },
    })
  }

  const expiresAt = new Date(now.getTime() + snapshot.timeLimitSec * 1000)

  let attempt: Attempt
  try {
    attempt = await prisma.$transaction(async (tx) => {
      const created = await tx.attempt.create({
        data: {
          quizId,
          userId: user.userId,
          userName: user.name,
          userEmail: user.email,
          snapshotId: snapshot!.id,
          startedAt: now,
          expiresAt,
          negativeMarking: quiz.negativeMarking,
          negativeMarkValue: quiz.negativeMarkValue,
          clientIdemKey: clientIdemKey || null,
        },
      })
      const payload: AttemptStartedData = { attemptId: created.id, quizId, userId: user.userId, startedAt: now.toISOString() }
      await tx.outbox.create({
        data: {
          aggregateType: "Attempt",
          aggregateId: created.id,
          topic: TOPICS.ATTEMPT_STARTED,
          key: user.userId,
          payload: createEnvelope(TOPICS.ATTEMPT_STARTED, payload, { producer: "assessment-svc" }) as any,
          headers: { "content-type": "application/json", "event-type": TOPICS.ATTEMPT_STARTED },
        },
      })
      return created
    })
  } catch (err) {
    // A concurrent double-click can race past the findFirst check above; the
    // database's partial unique index (attempt_one_inflight) is the real guard.
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      throw new ConflictError("An attempt is already in progress for this quiz")
    }
    throw err
  }

  return {
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
    sections: quiz.sections,
    questions: stripAnswerKey(quiz.questions),
    savedAnswers: [] as unknown[],
  }
}

export async function autosaveAnswers(prisma: PrismaClient, attemptId: string, userId: string, answers: AutosaveAnswer[]) {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } })
  if (!attempt || attempt.userId !== userId) throw new NotFoundError("Attempt not found")

  if (attempt.status !== "IN_PROGRESS") {
    throw new ConflictError(`Attempt is ${attempt.status.toLowerCase()}, cannot autosave`)
  }

  if (attempt.expiresAt <= new Date()) {
    // Conditional on status: if the sweeper or the user's own submit won the
    // CAS between our findUnique above and this write, the attempt is already
    // SUBMITTED with a computed score -- blindly overwriting to EXPIRED would
    // strand that score behind getResult's SUBMITTED gate forever.
    await prisma.attempt.updateMany({
      where: { id: attempt.id, status: "IN_PROGRESS" },
      data: { status: "EXPIRED" },
    })
    throw new ConflictError("Attempt has expired")
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

  return answers.length
}

// userId === null is the sweeper's path (worker.ts) -- no owning caller to check against.
export async function submitAttempt(
  prisma: PrismaClient,
  attemptId: string,
  userId: string | null,
  submitSource: "user" | "timer" | "sweeper"
) {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } })
  if (!attempt || (userId !== null && attempt.userId !== userId)) throw new NotFoundError("Attempt not found")

  const snapshot = await prisma.attemptSnapshot.findUniqueOrThrow({ where: { id: attempt.snapshotId } })
  const snapshotQuestions = snapshot.questions as unknown as SnapshotQuestionWithKey[]

  // Postgres compare-and-swap: the database, not this call, is the arbiter of
  // whether a submit "wins". A second concurrent submit (double-click, retry
  // after a dropped response, or the sweeper racing a user's own submit) sees
  // count 0 and replays the already-computed result instead of re-scoring.
  const cas = await prisma.attempt.updateMany({
    where: { id: attempt.id, status: "IN_PROGRESS" },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  })

  if (cas.count === 0) {
    const current = await prisma.attempt.findUniqueOrThrow({ where: { id: attempt.id } })
    if (current.status !== "SUBMITTED") {
      throw new ConflictError(`Attempt is ${current.status.toLowerCase()}, cannot submit`)
    }
    const attemptAnswers = await prisma.attemptAnswer.findMany({ where: { attemptId: current.id } })
    return formatAttemptResult(current, snapshot.quizTitle, snapshotQuestions, attemptAnswers)
  }

  const attemptAnswers = await prisma.attemptAnswer.findMany({ where: { attemptId: attempt.id } })

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
  const timeSpentMs = submittedAt.getTime() - attempt.startedAt.getTime()

  const sectionTotals = new Map<string, { correct: number; wrong: number; unanswered: number; total: number; timeSpentMs: number }>()
  for (const qr of scored.questionResults) {
    const s = sectionTotals.get(qr.section) ?? { correct: 0, wrong: 0, unanswered: 0, total: 0, timeSpentMs: 0 }
    s.total++
    s.timeSpentMs += qr.timeSpent
    if (qr.isUnanswered) s.unanswered++
    else if (qr.isCorrect) s.correct++
    else s.wrong++
    sectionTotals.set(qr.section, s)
  }
  const sectionScores = Array.from(sectionTotals.entries()).map(([section, s]) => ({
    section,
    correct: s.correct,
    wrong: s.wrong,
    unanswered: s.unanswered,
    total: s.total,
    scorePct: s.total > 0 ? (s.correct / s.total) * 100 : 0,
    timeSpentMs: s.timeSpentMs,
  }))

  const awardedFor = (qr: (typeof scored.questionResults)[number]) =>
    qr.isCorrect ? 1 : qr.isUnanswered ? 0 : attempt.negativeMarking ? -attempt.negativeMarkValue : 0

  const eventPayload: AttemptSubmittedData = {
    attemptId: attempt.id,
    quizId: attempt.quizId,
    quizTitle: snapshot.quizTitle,
    chapterId: null,
    subjectId: null,
    userId: attempt.userId,
    userName: attempt.userName,
    userEmail: attempt.userEmail,
    startedAt: attempt.startedAt.toISOString(),
    submittedAt: submittedAt.toISOString(),
    submitSource,
    scoringVersion: attempt.scoringVersion,
    totalScore: scored.totalScore,
    rawScore: scored.rawScore,
    maxScore: scoringQuestions.length,
    correctCount: scored.correctAnswers,
    wrongCount: scored.wrongAnswers,
    unansweredCount: scored.unanswered,
    timeSpentMs,
    sectionScores,
    questionOutcomes: scored.questionResults.map((qr) => ({
      questionId: qr.questionId,
      section: qr.section,
      selectedOption: qr.selectedAnswer,
      isCorrect: qr.isCorrect,
      timeSpentMs: qr.timeSpent,
    })),
    outcomesRef: null,
  }

  const updatedAttempt = await prisma.$transaction(async (tx) => {
    const updated = await tx.attempt.update({
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
        timeSpentMs,
      },
    })

    for (const qr of scored.questionResults) {
      await tx.attemptAnswer.upsert({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: qr.questionId } },
        update: { isCorrect: qr.isCorrect, awarded: awardedFor(qr) },
        create: {
          attemptId: attempt.id,
          questionId: qr.questionId,
          section: qr.section,
          selectedOption: qr.selectedAnswer,
          isCorrect: qr.isCorrect,
          awarded: awardedFor(qr),
        },
      })
    }

    await tx.outbox.create({
      data: {
        aggregateType: "Attempt",
        aggregateId: attempt.id,
        topic: TOPICS.ATTEMPT_SUBMITTED,
        key: attempt.userId,
        payload: createEnvelope(TOPICS.ATTEMPT_SUBMITTED, eventPayload, { producer: "assessment-svc" }) as any,
        headers: { "content-type": "application/json", "event-type": TOPICS.ATTEMPT_SUBMITTED },
      },
    })

    return updated
  })

  const finalAnswers = await prisma.attemptAnswer.findMany({ where: { attemptId: attempt.id } })
  return formatAttemptResult(updatedAttempt, snapshot.quizTitle, snapshotQuestions, finalAnswers)
}

export async function getResult(prisma: PrismaClient, attemptId: string, userId: string) {
  const attempt = await prisma.attempt.findUnique({ where: { id: attemptId } })
  if (!attempt || attempt.userId !== userId) throw new NotFoundError("Result not found")

  if (attempt.status !== "SUBMITTED") {
    throw new ConflictError(`Attempt is ${attempt.status.toLowerCase()}, not yet submitted`)
  }

  const [snapshot, attemptAnswers] = await Promise.all([
    prisma.attemptSnapshot.findUniqueOrThrow({ where: { id: attempt.snapshotId } }),
    prisma.attemptAnswer.findMany({ where: { attemptId: attempt.id } }),
  ])

  return formatAttemptResult(attempt, snapshot.quizTitle, snapshot.questions as unknown as SnapshotQuestionWithKey[], attemptAnswers)
}
