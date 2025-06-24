"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { Clock, ArrowLeft, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

interface Quiz {
  id: string
  title: string
  description: string
  duration: number
  sections: string[]
  questions: Question[]
  isActive: boolean
  negativeMarking: boolean
  negativeMarkValue: number
}

interface Question {
  id: string
  quizId: string
  section: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  image?: string
}

interface Answer {
  questionId: string
  selectedAnswer: number
}

export default function QuizPage({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Load quiz from localStorage
    const savedQuizzes = JSON.parse(localStorage.getItem("adminQuizzes") || "[]")
    const foundQuiz = savedQuizzes.find((q: Quiz) => q.id === params.id && q.isActive)

    if (foundQuiz) {
      // Add negative marking properties if not present (for backward compatibility)
      const quizWithNegativeMarking = {
        ...foundQuiz,
        negativeMarking: foundQuiz.negativeMarking ?? true,
        negativeMarkValue: foundQuiz.negativeMarkValue ?? 0.25,
      }
      setQuiz(quizWithNegativeMarking)
      setTimeLeft(quizWithNegativeMarking.duration * 60) // Convert minutes to seconds
    }
    setLoading(false)
  }, [params.id])

  useEffect(() => {
    if (timeLeft > 0 && !loading && quiz?.duration !== 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0 && quiz?.duration !== 0) {
      handleSubmit()
    }
  }, [timeLeft, loading, quiz])

  const handleAnswerChange = (questionId: string, selectedAnswer: number) => {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId)
      if (existing) {
        return prev.map((a) => (a.questionId === questionId ? { ...a, selectedAnswer } : a))
      }
      return [...prev, { questionId, selectedAnswer }]
    })
  }

  const calculateScore = () => {
    if (!quiz) return { totalScore: 0, rawScore: 0, negativeMarks: 0 }

    let correctAnswers = 0
    let wrongAnswers = 0
    let unanswered = 0

    for (const question of quiz.questions) {
      const userAnswer = answers.find((a) => a.questionId === question.id)

      if (!userAnswer || userAnswer.selectedAnswer === -1) {
        unanswered++
      } else if (userAnswer.selectedAnswer === question.correctAnswer) {
        correctAnswers++
      } else {
        wrongAnswers++
      }
    }

    const positiveMarks = correctAnswers * 1 // 1 mark per correct answer
    const negativeMarks = quiz.negativeMarking ? wrongAnswers * quiz.negativeMarkValue : 0
    const rawScore = positiveMarks - negativeMarks
    const totalScore = Math.max(0, Math.round((rawScore / quiz.questions.length) * 100))

    return {
      totalScore,
      rawScore,
      positiveMarks,
      negativeMarks,
      correctAnswers,
      wrongAnswers,
      unanswered,
    }
  }

  const handleSubmit = async () => {
    if (!quiz) return
    setSubmitting(true)

    const scoreData = calculateScore()

    // Calculate section-wise scores with negative marking
    const sectionScores = { reasoning: 0, quantitative: 0, english: 0 }
    const sectionTotals = { reasoning: 0, quantitative: 0, english: 0 }
    const sectionCorrect = { reasoning: 0, quantitative: 0, english: 0 }
    const sectionWrong = { reasoning: 0, quantitative: 0, english: 0 }
    const questionResults = []

    for (const question of quiz.questions) {
      const userAnswer = answers.find((a) => a.questionId === question.id)
      const isCorrect = userAnswer && userAnswer.selectedAnswer === question.correctAnswer
      const isWrong =
        userAnswer && userAnswer.selectedAnswer !== question.correctAnswer && userAnswer.selectedAnswer !== -1

      if (isCorrect) {
        sectionCorrect[question.section as keyof typeof sectionCorrect]++
      } else if (isWrong) {
        sectionWrong[question.section as keyof typeof sectionWrong]++
      }

      sectionTotals[question.section as keyof typeof sectionTotals]++

      questionResults.push({
        question: question.question,
        options: question.options,
        selectedAnswer: userAnswer?.selectedAnswer ?? -1,
        correctAnswer: question.correctAnswer,
        isCorrect,
        section: question.section,
        explanation: question.explanation,
        image: question.image,
      })
    }

    // Calculate section percentages with negative marking
    const sectionPercentages = {
      reasoning:
        sectionTotals.reasoning > 0
          ? Math.max(
              0,
              Math.round(
                ((sectionCorrect.reasoning -
                  (quiz.negativeMarking ? sectionWrong.reasoning * quiz.negativeMarkValue : 0)) /
                  sectionTotals.reasoning) *
                  100,
              ),
            )
          : 0,
      quantitative:
        sectionTotals.quantitative > 0
          ? Math.max(
              0,
              Math.round(
                ((sectionCorrect.quantitative -
                  (quiz.negativeMarking ? sectionWrong.quantitative * quiz.negativeMarkValue : 0)) /
                  sectionTotals.quantitative) *
                  100,
              ),
            )
          : 0,
      english:
        sectionTotals.english > 0
          ? Math.max(
              0,
              Math.round(
                ((sectionCorrect.english - (quiz.negativeMarking ? sectionWrong.english * quiz.negativeMarkValue : 0)) /
                  sectionTotals.english) *
                  100,
              ),
            )
          : 0,
    }

    // Store result in localStorage
    const result = {
      _id: Date.now().toString(),
      date: new Date().toISOString(),
      quizName: quiz.title,
      quizId: quiz.id,
      totalScore: scoreData.totalScore,
      rawScore: scoreData.rawScore,
      positiveMarks: scoreData.positiveMarks,
      negativeMarks: scoreData.negativeMarks,
      correctAnswers: scoreData.correctAnswers,
      wrongAnswers: scoreData.wrongAnswers,
      unanswered: scoreData.unanswered,
      sections: sectionPercentages,
      questions: questionResults,
      timeSpent: quiz.duration ? quiz.duration * 60 - timeLeft : 0,
      negativeMarking: quiz.negativeMarking,
      negativeMarkValue: quiz.negativeMarkValue,
    }

    const existingResults = JSON.parse(localStorage.getItem("quizResults") || "[]")
    existingResults.push(result)
    localStorage.setItem("quizResults", JSON.stringify(existingResults))

    router.push(`/results/${result._id}`)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getProgress = () => {
    if (!quiz) return 0
    return ((currentQuestionIndex + 1) / quiz.questions.length) * 100
  }

  const getAnsweredCount = () => {
    return answers.length
  }

  const nextQuestion = () => {
    if (quiz && currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading quiz...</div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Quiz not found or inactive</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const userAnswer = answers.find((a) => a.questionId === currentQuestion.id)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{quiz.title}</h1>
              <p className="text-muted-foreground">{quiz.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {quiz.duration > 0 && (
              <div className="flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-5 w-5" />
                <span className={timeLeft < 60 ? "text-red-600 dark:text-red-400" : "text-foreground"}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Quiz"}
            </Button>
          </div>
        </div>

        {/* Negative Marking Warning */}
        {quiz.negativeMarking && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Negative Marking:</strong> Each wrong answer will deduct {quiz.negativeMarkValue} marks.
              Unanswered questions carry no penalty.
            </AlertDescription>
          </Alert>
        )}

        {/* Progress and Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {quiz.questions.length}
                </span>
              </div>
              <Progress value={getProgress()} className="h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Answered</span>
                <span className="text-sm text-muted-foreground">
                  {getAnsweredCount()} of {quiz.questions.length} questions
                </span>
              </div>
              <Progress value={(getAnsweredCount() / quiz.questions.length) * 100} className="h-2" />
            </CardContent>
          </Card>
        </div>

        {/* Question */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">
              Question {currentQuestionIndex + 1}
              <span className="ml-2 text-sm font-normal text-muted-foreground">({currentQuestion.section})</span>
            </CardTitle>
            <CardDescription>{currentQuestion.question}</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Question Image */}
            {currentQuestion.image && (
              <div className="mb-4">
                <img
                  src={currentQuestion.image || "/placeholder.svg"}
                  alt="Question illustration"
                  className="max-w-full h-auto rounded border"
                />
              </div>
            )}

            <RadioGroup
              value={userAnswer?.selectedAnswer?.toString() || ""}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, Number.parseInt(value))}
            >
              {currentQuestion.options.map((option, optionIndex) => (
                <div key={optionIndex} className="flex items-center space-x-2">
                  <RadioGroupItem value={optionIndex.toString()} id={`${currentQuestion.id}-${optionIndex}`} />
                  <Label htmlFor={`${currentQuestion.id}-${optionIndex}`} className="cursor-pointer flex-1">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {/* Clear Answer Option */}
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAnswers((prev) => prev.filter((a) => a.questionId !== currentQuestion.id))
                }}
                disabled={!userAnswer}
              >
                Clear Answer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={prevQuestion} disabled={currentQuestionIndex === 0}>
            Previous
          </Button>

          <div className="flex gap-2 flex-wrap">
            {quiz.questions.map((_, index) => {
              const questionAnswer = answers.find((a) => a.questionId === quiz.questions[index].id)
              const isAnswered = questionAnswer !== undefined
              const isCurrent = index === currentQuestionIndex

              return (
                <Button
                  key={index}
                  variant={isCurrent ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 p-0 ${
                    isAnswered ? "bg-green-100 border-green-300 dark:bg-green-900 dark:border-green-700" : ""
                  }`}
                >
                  {index + 1}
                </Button>
              )
            })}
          </div>

          <Button
            variant="outline"
            onClick={nextQuestion}
            disabled={currentQuestionIndex === quiz.questions.length - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
