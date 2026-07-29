// Quiz metadata only -- deliberately no `questions` field with answer keys.
// The full quiz (with correctAnswer/explanation) is only ever served from
// catalog-svc's /internal/quizzes/:id/full endpoint, which the gateway never
// exposes and only assessment-svc calls, once, at attempt-start time.
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
