// Shapes a scored Attempt into the same JSON shape app/results/[id]/page.tsx's
// `Result` interface already expects from the old /api/results/[id] endpoint, so
// pointing that page at the new endpoint is a URL change, not a rewrite.
//
// Unit note, preserved intentionally rather than "fixed": the page's own math
// treats the top-level `timeSpent` as SECONDS (line ~294: `result.timeSpent / 60`)
// but each per-question `timeSpent` as MILLISECONDS (formatTime divides by 1000).
// That inconsistency predates this change; this formatter matches it rather than
// introducing a third convention the page wasn't built to read.

import type { Attempt, AttemptAnswer } from "@/lib/generated/prisma"

export interface SnapshotQuestionWithKey {
  id: string
  section: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  image?: string
}

export function formatAttemptResult(
  attempt: Attempt,
  quizTitle: string,
  snapshotQuestions: SnapshotQuestionWithKey[],
  attemptAnswers: AttemptAnswer[]
) {
  const answersByQuestion = new Map(attemptAnswers.map((a) => [a.questionId, a]))

  const questions = snapshotQuestions.map((q) => {
    const saved = answersByQuestion.get(q.id)
    const selectedAnswer = saved?.selectedOption ?? null
    return {
      questionId: q.id,
      question: q.question,
      options: q.options,
      selectedAnswer,
      correctAnswer: q.correctAnswer,
      isCorrect: saved?.isCorrect ?? false,
      isUnanswered: selectedAnswer === null,
      section: q.section,
      explanation: q.explanation,
      image: q.image,
      timeSpent: saved?.timeSpentMs ?? 0, // milliseconds, matches formatTime() on the results page
    }
  })

  const sections: Record<string, number> = {}
  const sectionStats: Record<string, { correct: number; total: number }> = {}
  for (const q of questions) {
    if (!sectionStats[q.section]) sectionStats[q.section] = { correct: 0, total: 0 }
    sectionStats[q.section].total++
    if (q.isCorrect) sectionStats[q.section].correct++
  }
  for (const [section, { correct, total }] of Object.entries(sectionStats)) {
    sections[section] = total > 0 ? (correct / total) * 100 : 0
  }

  const timeSpentSeconds =
    attempt.submittedAt && attempt.startedAt
      ? Math.round((attempt.submittedAt.getTime() - attempt.startedAt.getTime()) / 1000)
      : 0

  return {
    _id: attempt.id,
    date: (attempt.submittedAt ?? attempt.startedAt).toISOString(),
    quizName: quizTitle,
    quizId: attempt.quizId,
    totalScore: attempt.totalScore ?? 0,
    rawScore: attempt.rawScore ?? 0,
    correctAnswers: attempt.correctCount ?? 0,
    wrongAnswers: attempt.wrongCount ?? 0,
    unanswered: attempt.unansweredCount ?? 0,
    sections,
    questions,
    negativeMarking: attempt.negativeMarking,
    negativeMarkValue: attempt.negativeMarkValue,
    timeSpent: timeSpentSeconds,
  }
}
