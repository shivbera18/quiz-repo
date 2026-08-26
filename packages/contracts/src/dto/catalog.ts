// Quiz metadata only -- deliberately no `questions` field with answer keys.
// The full quiz (with correctAnswer/explanation) is only ever served from
// catalog-svc's /internal/quizzes/:id/full endpoint, which the gateway never
// exposes and only assessment-svc calls, once, at attempt-start time.
import { z } from "zod"

export interface QuizSummaryDTO {
  id: string
  title: string
  description: string
  timeLimitSec: number
  sectionNames: string[]
  questionCount: number
  isActive: boolean
  negativeMarking: boolean
  negativeMarkValue: number
  chapterId: string | null
}

export interface FullQuizQuestionDTO {
  id: string
  section: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  image?: string
}

export interface FullQuizDTO {
  id: string
  title: string
  version: number
  isActive: boolean
  timeLimitSec: number
  negativeMarking: boolean
  negativeMarkValue: number
  sections: string[]
  questions: FullQuizQuestionDTO[]
}

export interface SubjectDTO {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
}

export interface ChapterDTO {
  id: string
  name: string
  description?: string
  subjectId: string
  quizCount: number
  questionCount: number
}

// ---------------------------------------------------------------------------
// Admin write-path validation schemas. The admin routes previously parsed
// request bodies with bare property access, so malformed input produced
// Prisma errors and 500s instead of 400s. These are the single source of
// truth for what catalog-svc will accept; unknown keys are stripped
// (non-strict objects), so extra client fields never reach the database.
// ---------------------------------------------------------------------------

export const subjectCreateSchema = z.object({
  name: z.string().trim().min(1, "Subject name is required").max(200),
  description: z.string().max(2000).optional(),
  icon: z.string().max(64).optional(),
  color: z.string().max(64).optional(),
})
export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>

export const subjectUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  icon: z.string().max(64).nullable().optional(),
  color: z.string().max(64).nullable().optional(),
})
export type SubjectUpdateInput = z.infer<typeof subjectUpdateSchema>

export const chapterCreateSchema = z.object({
  name: z.string().trim().min(1, "Chapter name is required").max(200),
  description: z.string().max(2000).optional(),
  subjectId: z.string().min(1, "subjectId is required"),
})
export type ChapterCreateInput = z.infer<typeof chapterCreateSchema>

export const chapterUpdateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
})
export type ChapterUpdateInput = z.infer<typeof chapterUpdateSchema>

const storedQuestionSchema = z.object({
  id: z.string().optional(),
  section: z.string().trim().min(1),
  question: z.string().trim().min(1),
  options: z.array(z.string()).length(4),
  correctAnswer: z.number().int().min(0).max(3),
  explanation: z.string().max(8000).optional(),
  image: z.string().max(2_000_000).optional(), // base64 guard (~1.5MB decoded)
})
export type StoredQuestionInput = z.infer<typeof storedQuestionSchema>

const sectionsSchema = z.array(z.string().trim().min(1)).min(1, "At least one section is required").max(10)
const negativeMarkValueSchema = z.number().min(0.1).max(1)

export const quizCreateSchema = z.object({
  title: z.string().trim().min(3, "Quiz title must be 3-200 characters").max(200),
  description: z.string().max(5000).optional(),
  duration: z.coerce.number({ invalid_type_error: "Quiz duration must be a number" }).int().min(5, "Duration must be 5-300 minutes").max(300),
  subjectId: z.string().min(1).optional(),
  chapterId: z.string().min(1, "Chapter selection is required"),
  sections: sectionsSchema,
  questions: z.array(storedQuestionSchema).max(500).optional(),
  negativeMarking: z.boolean().optional(),
  negativeMarkValue: negativeMarkValueSchema.optional(),
})
export type QuizCreateInput = z.infer<typeof quizCreateSchema>

export const quizPatchSchema = z.object({
  version: z.number({ required_error: "version is required (send back the version you last read)", invalid_type_error: "version must be a number" }).int().positive(),
  title: z.string().trim().min(3).max(200).optional(),
  description: z.string().max(5000).optional(),
  duration: z.coerce.number().int().min(5).max(300).optional(),
  sections: sectionsSchema.optional(),
  questions: z.array(storedQuestionSchema).max(500).optional(),
  isActive: z.boolean().optional(),
  negativeMarking: z.boolean().optional(),
  negativeMarkValue: negativeMarkValueSchema.optional(),
  // "none"/"" keep their historical PATCH semantics (leave chapter unchanged);
  // a real id re-points the quiz.
  chapterId: z.union([z.literal("none"), z.literal(""), z.null(), z.string().min(1)]).optional(),
})
export type QuizPatchInput = z.infer<typeof quizPatchSchema>

// Accepts legacy capitalized values but normalizes to the lowercase set the
// rest of the system uses.
export const questionDifficultySchema = z
  .string()
  .transform((s) => s.toLowerCase())
  .pipe(z.enum(["easy", "medium", "hard"]))

export const questionBankCreateSchema = z.object({
  section: z.string().trim().min(1, "section is required").max(120),
  question: z.string().trim().min(1, "question text is required").max(5000),
  options: z.array(z.string()).length(4, "Exactly four options are required"),
  correctAnswer: z.number().int().min(0, "correctAnswer must be an option index (0-3)").max(3),
  explanation: z.string().max(8000).optional(),
  difficulty: questionDifficultySchema.default("medium"),
  tags: z.array(z.string().max(50)).max(20).optional(),
  image: z.string().max(2_000_000).optional(),
  source: z.string().max(500).optional(),
})
export type QuestionBankCreateInput = z.infer<typeof questionBankCreateSchema>

export const questionBankUpdateSchema = z.object({
  section: z.string().trim().min(1).max(120).optional(),
  question: z.string().trim().min(1).max(5000).optional(),
  options: z.array(z.string()).length(4).optional(),
  correctAnswer: z.number().int().min(0).max(3).optional(),
  explanation: z.string().max(8000).nullable().optional(),
  difficulty: questionDifficultySchema.optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  image: z.string().max(2_000_000).optional(),
  source: z.string().max(500).optional(),
  isVerified: z.boolean().optional(),
})
export type QuestionBankUpdateInput = z.infer<typeof questionBankUpdateSchema>

// Fastify's default query parser yields string | string[] per key; repeated
// ?tag=a&tag=b (what the admin UI sends) arrives as an array.
export const questionBankListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000, "limit is capped at 1000").catch(20).default(20),
  section: z.string().min(1).optional(),
  difficulty: z.string().min(1).optional(),
  search: z.string().max(300).optional(),
  tag: z.union([z.string(), z.array(z.string())]).optional(),
})
export type QuestionBankListQuery = z.infer<typeof questionBankListQuerySchema>
