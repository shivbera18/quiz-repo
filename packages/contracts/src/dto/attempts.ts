import { z } from "zod"

export const startAttemptRequestSchema = z.object({
  quizId: z.string().min(1),
  clientIdemKey: z.string().optional(),
})
export type StartAttemptRequest = z.infer<typeof startAttemptRequestSchema>

export const autosaveAnswerSchema = z.object({
  questionId: z.string().min(1),
  section: z.string().min(1),
  selectedAnswer: z.number().int().nullable(),
  markedForReview: z.boolean().optional(),
  visited: z.boolean().optional(),
  timeSpentMs: z.number().int().nonnegative().optional(),
  clientSeq: z.number().int().nonnegative().optional(),
})
export type AutosaveAnswer = z.infer<typeof autosaveAnswerSchema>

export const autosaveRequestSchema = z.object({
  // Upper bound keeps one PATCH from doing an unbounded number of sequential
  // row writes (and from exceeding the interactive transaction's timeout in
  // assessment's autosave). Real clients save per-question or small dirty
  // sets; 200 is far above any legitimate quiz size.
  answers: z.array(autosaveAnswerSchema).min(1).max(200),
})
export type AutosaveRequest = z.infer<typeof autosaveRequestSchema>

export const submitAttemptRequestSchema = z.object({
  submitSource: z.enum(["user", "timer", "sweeper"]).optional(),
})
export type SubmitAttemptRequest = z.infer<typeof submitAttemptRequestSchema>

export interface AttemptQuestionDTO {
  id: string
  section: string
  question: string
  options: string[]
  image?: string
}

export interface StartAttemptResponseDTO {
  attemptId: string
  quizId: string
  quizTitle: string
  resumed: boolean
  startedAt: string
  expiresAt: string
  serverTime: string
  remainingMs: number
  timeLimitSec: number
  negativeMarking: boolean
  negativeMarkValue: number
  sections: string[]
  questions: AttemptQuestionDTO[]
  savedAnswers: Array<{
    questionId: string
    selectedAnswer: number | null
    markedForReview: boolean
    visited: boolean
    timeSpentMs: number
    clientSeq: number
  }>
}
