import { z } from "zod"

// Manual bookmark capture. Content is supplied by the client from the result
// view (which already holds the scored snapshot) and frozen server-side, so
// later quiz edits never mutate notebook entries.
export const bookmarkCreateSchema = z.object({
  questionId: z.string().min(1),
  quizId: z.string().min(1),
  section: z.string().trim().min(1).max(120),
  question: z.string().trim().min(1).max(5000),
  options: z.array(z.string()).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string().max(8000).optional(),
})
export type BookmarkCreateInput = z.infer<typeof bookmarkCreateSchema>

export const notebookOutcomeSchema = z.object({
  correct: z.boolean(),
})
export type NotebookOutcomeInput = z.infer<typeof notebookOutcomeSchema>

export const notebookListQuerySchema = z.object({
  kind: z.enum(["WRONG_ANSWER", "BOOKMARK"]).optional(),
  due: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).catch(50).default(50),
})
export type NotebookListQuery = z.infer<typeof notebookListQuerySchema>
