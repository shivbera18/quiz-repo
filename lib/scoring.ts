// Extracted verbatim (same formulas, same edge-case behavior) from the client-side
// scoring logic that used to live in app/quiz/[id]/page.tsx handleSubmit(). This is the
// reference implementation that server-side scoring (Phase 4) must reproduce exactly.

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

/**
 * Pure scoring function. Given the quiz's questions (with answer keys), the
 * user's submitted answers, and marking config, computes the exact same
 * scoreData/sectionPercentages/questionResults shape the client used to compute
 * in-browser before being trusted verbatim by POST /api/results.
 */
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
    const hasAnswered =
      !!userAnswer && userAnswer.selectedAnswer !== null && userAnswer.selectedAnswer !== undefined
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

  return {
    correctAnswers,
    wrongAnswers,
    unanswered,
    rawScore,
    totalScore,
    sectionPercentages,
    questionResults,
  }
}
