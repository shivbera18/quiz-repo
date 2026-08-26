// Shared event-payload builders for catalog-svc. Kept in one place so the
// HTTP routes and background workers (e.g. catalog-ai-worker) emit
// byte-identical change events for the same entity shapes.
import { parseJsonField } from "./database-utils.js"
import type { QuizChangedData } from "@quiz/contracts"
import type { StoredQuestion } from "../types.js"

export function quizChangedPayload(quiz: {
  id: string
  title: string
  chapterId: string | null
  timeLimit: number
  sections: string
  questions: string
  negativeMarking: boolean
  negativeMarkValue: number
  isActive: boolean
  createdBy: string
  createdAt: Date
  version: number
}): QuizChangedData {
  const questions = parseJsonField(quiz.questions) as StoredQuestion[]
  return {
    quizId: quiz.id,
    quizVersion: quiz.version,
    title: quiz.title,
    chapterId: quiz.chapterId,
    subjectId: null, // resolved by consumers via chapterId -> DimChapter if they need it
    sectionNames: parseJsonField(quiz.sections),
    questionCount: questions.length,
    timeLimitSec: quiz.timeLimit * 60,
    negativeMarking: quiz.negativeMarking,
    negativeMarkValue: quiz.negativeMarkValue,
    isActive: quiz.isActive,
    createdBy: quiz.createdBy,
    createdAt: quiz.createdAt.toISOString(),
    updatedAt: new Date().toISOString(),
  }
}
