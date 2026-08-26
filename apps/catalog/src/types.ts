export interface StoredQuestion {
  id: string
  section: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  image?: string
}
