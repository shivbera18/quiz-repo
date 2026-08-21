// Topic naming: quiz.<domain>.<event>.v<n>. See ARCHITECTURE.md's Kafka section
// for the key/retention/compaction rationale behind each one -- it's not
// repeated here to avoid the two drifting apart.
export const TOPICS = {
  ATTEMPT_SUBMITTED: "quiz.assessment.attempt-submitted.v1",
  ATTEMPT_STARTED: "quiz.assessment.attempt-started.v1",
  QUIZ_CHANGED: "quiz.catalog.quiz-changed.v1",
  CHAPTER_CHANGED: "quiz.catalog.chapter-changed.v1",
  SUBJECT_CHANGED: "quiz.catalog.subject-changed.v1",
  USER_CHANGED: "quiz.identity.user-changed.v1",
  USER_ERASURE_REQUESTED: "quiz.identity.user-erasure-requested.v1",
  ANNOUNCEMENT_PUBLISHED: "quiz.notification.announcement-published.v1",
  PUSH_SEND_REQUESTED: "quiz.notification.push-send-requested.v1",
  AI_QUIZ_GENERATION_REQUESTED: "quiz.ai.quiz-generation-requested.v1",
  AI_QUIZ_GENERATION_COMPLETED: "quiz.ai.quiz-generation-completed.v1",
  EXPORT_REQUESTED: "quiz.analytics.export-requested.v1",
  EXPORT_COMPLETED: "quiz.analytics.export-completed.v1",
} as const

export type TopicName = (typeof TOPICS)[keyof typeof TOPICS]

export interface QuestionOutcome {
  questionId: string
  section: string
  selectedOption: number | null
  isCorrect: boolean
  timeSpentMs: number
}

export interface AttemptSubmittedData {
  attemptId: string
  quizId: string
  quizTitle: string
  chapterId: string | null
  subjectId: string | null
  userId: string
  userName: string
  userEmail: string
  startedAt: string
  submittedAt: string
  submitSource: "user" | "timer" | "sweeper"
  scoringVersion: number
  totalScore: number
  rawScore: number
  maxScore: number
  correctCount: number
  wrongCount: number
  unansweredCount: number
  timeSpentMs: number
  sectionScores: Array<{
    section: string
    correct: number
    wrong: number
    unanswered: number
    total: number
    scorePct: number
    timeSpentMs: number
  }>
  // Claim-check pattern: null + outcomesRef set once questionOutcomes would push
  // the record past a sane size (see ARCHITECTURE.md). Not implemented by any
  // consumer yet since no attempt in this system is large enough to need it --
  // documented as the extension point it is, not built ahead of the need.
  questionOutcomes: QuestionOutcome[] | null
  outcomesRef: string | null
}

export interface AttemptStartedData {
  attemptId: string
  quizId: string
  userId: string
  startedAt: string
}

export interface QuizChangedData {
  quizId: string
  quizVersion: number
  title: string
  chapterId: string | null
  subjectId: string | null
  sectionNames: string[]
  questionCount: number
  timeLimitSec: number
  negativeMarking: boolean
  negativeMarkValue: number
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface ChapterChangedData {
  chapterId: string
  subjectId: string
  name: string
}

export interface SubjectChangedData {
  subjectId: string
  name: string
}

export interface UserChangedData {
  userId: string
  name: string
  email: string
  isAdmin: boolean
  userType: string
  createdAt: string
  updatedAt: string
  deletedAt: string | null
}

export interface UserErasureRequestedData {
  userId: string
}

export interface AnnouncementPublishedData {
  announcementId: string
  title: string
  content: string
  priority: string
}

export interface PushSendRequestedData {
  announcementId: string
  userId: string
  subscriptionId: string
  payload: { title: string; body: string; url?: string; tag?: string; priority?: string }
}

// Keyed by jobId, not requestedBy -- there is no ordering requirement between
// generation jobs, and keying by the requesting admin would serialize one
// admin's several jobs onto a single partition. See ARCHITECTURE.md's
// cargo-cult audit: this is also named there as a topic that arguably
// shouldn't be on Kafka at all (a job-queue library like pg-boss/BullMQ fits
// this shape better) -- kept on Kafka here for the demonstration value, with
// that trade-off stated rather than hidden.
export interface AiQuizGenerationRequestedData {
  jobId: string
  requestedBy: string
  title: string
  sections: string[]
  difficulty: string
  questionsPerSection: number
}

export interface AiQuizGenerationCompletedData {
  jobId: string
  status: "succeeded" | "partial" | "failed"
  quizId: string | null
  generated: Array<{ section: string; count: number }>
  failures: Array<{ section: string; reason: string }>
  elapsedMs: number
}

export interface ExportRequestedData {
  jobId: string
  requestedBy: string
  kind: "quiz-results" | "user-performance"
  format: "csv"
  filters: { from?: string; to?: string; quizIds?: string[]; subjectIds?: string[] }
}

export interface ExportCompletedData {
  jobId: string
  status: "done" | "failed"
  objectKey: string | null
  rowCount: number | null
  bytes: number | null
  expiresAt: string | null
  error: string | null
}
