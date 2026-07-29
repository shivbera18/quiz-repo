// Copied verbatim from the monolith's lib/scoring.ts (same formulas, same
// edge-case behavior). This is the reference implementation both the submit
// route and the expiry-sweeper worker call -- factored here once so they
// can't drift from each other. See tests/scoring.test.ts for the 26
// golden-fixture cases this must keep passing.

export interface ScoringQuestion {
  id: string
  section: string
  correctAnswer: number
  question?: string
  options?: string[]
  explanation?: string
  image?: string
}

export interface ScoringAnswer {
  questionId: string
  selectedAnswer: number | null | undefined
}

export interface QuestionScoreResult {
  questionId: string
  question?: string
  options?: string[]
  selectedAnswer: number | null
  correctAnswer: number
  isCorrect: boolean
  isUnanswered: boolean
  section: string
  explanation?: string
  image?: string
  timeSpent: number
}

export interface ScoreQuizOptions {
  negativeMarking: boolean
  negativeMarkValue: number
  questionTimes?: Record<string, number>
}

export interface QuizScoreSummary {
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  rawScore: number
  totalScore: number
  sectionPercentages: Record<string, number>
  questionResults: QuestionScoreResult[]
}

export function scoreQuiz(
  questions: ScoringQuestion[],
  answers: ScoringAnswer[],
  { negativeMarking, negativeMarkValue, questionTimes = {} }: ScoreQuizOptions
): QuizScoreSummary {
  let correctAnswers = 0
  let wrongAnswers = 0
  let unanswered = 0
  let rawScore = 0

  const sectionStats: Record<string, { correct: number; total: number }> = {}
  questions.forEach((question) => {
    if (!sectionStats[question.section]) {
      sectionStats[question.section] = { correct: 0, total: 0 }
    }
    sectionStats[question.section].total++
  })

  const questionResults: QuestionScoreResult[] = questions.map((question) => {
    const userAnswer = answers.find((a) => a.questionId === question.id)
    const hasAnswered = !!userAnswer && userAnswer.selectedAnswer !== null && userAnswer.selectedAnswer !== undefined
    const isCorrect = hasAnswered && userAnswer!.selectedAnswer === question.correctAnswer

    if (!hasAnswered) {
      unanswered++
    } else if (isCorrect) {
      correctAnswers++
      rawScore++
      sectionStats[question.section].correct++
    } else {
      wrongAnswers++
      if (negativeMarking) {
        rawScore -= negativeMarkValue
      }
    }

    return {
      questionId: question.id,
      question: question.question,
      options: question.options,
      selectedAnswer: hasAnswered ? (userAnswer!.selectedAnswer as number) : null,
      correctAnswer: question.correctAnswer,
      isCorrect: isCorrect || false,
      isUnanswered: !hasAnswered,
      section: question.section,
      explanation: question.explanation,
      image: question.image,
      timeSpent: questionTimes[question.id] || 0,
    }
  })

  const sectionPercentages: Record<string, number> = {}
  Object.keys(sectionStats).forEach((section) => {
    const { correct, total } = sectionStats[section]
    sectionPercentages[section] = total > 0 ? (correct / total) * 100 : 0
  })

  const totalScore = Math.max(0, (rawScore / questions.length) * 100)

  return { correctAnswers, wrongAnswers, unanswered, rawScore, totalScore, sectionPercentages, questionResults }
}
