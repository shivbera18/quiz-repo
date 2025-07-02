"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { ThemeToggle } from "@/components/theme-toggle"
import { Clock, ArrowLeft, AlertTriangle, Home } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import MathRenderer from "@/components/math-renderer"

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
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  // Enhanced back navigation logic
  const getBackUrl = () => {
    // Check if user came from sectional tests via URL parameters
    const fromSubject = searchParams.get('fromSubject')
    const fromChapter = searchParams.get('fromChapter')
    
    if (fromSubject && fromChapter) {
      return `/dashboard/sectional-tests/${fromSubject}/${fromChapter}`
    } else if (fromSubject) {
      return `/dashboard/sectional-tests/${fromSubject}`
    }
    
    // Check if user came from sectional tests via referrer
    if (typeof window !== 'undefined') {
      const referrer = document.referrer
      if (referrer.includes('sectional-tests')) {
        const match = referrer.match(/sectional-tests\/([^\/]+)(?:\/([^\/]+))?/)
        if (match) {
          const [, subjectId, chapterId] = match
          if (chapterId) {
            return `/dashboard/sectional-tests/${subjectId}/${chapterId}`
          }
          return `/dashboard/sectional-tests/${subjectId}`
        }
        return '/dashboard/sectional-tests'
      }
    }
    
    // Default to dashboard
    return '/dashboard'
  }

  const getBackButtonText = () => {
    const backUrl = getBackUrl()
    if (backUrl.includes('sectional-tests')) {
      if (backUrl.split('/').length === 5) { // Has chapter
        return 'Back to Chapter'
      } else if (backUrl.split('/').length === 4) { // Has subject
        return 'Back to Subject'
      }
      return 'Back to Sectional Tests'
    }
    return 'Back to Dashboard'
  }

  const handleBackNavigation = () => {
    router.push(getBackUrl())
  }

  useEffect(() => {
    // Wait for auth to load and check if user is authenticated
    if (authLoading) return
    
    if (!user) {
      alert("Please log in to take the quiz")
      router.push("/auth/login")
      return
    }

    // Fetch quiz from backend API with authentication
    const fetchQuiz = async () => {
      try {
        const res = await fetch(`/api/quizzes/${params.id}`, {
          headers: {
            Authorization: `Bearer ${user.token || "student-token-placeholder"}`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
          },
        })
        
        if (!res.ok) {
          throw new Error("Quiz not found or inactive")
        }
        const data = await res.json()
        const foundQuiz = data.quiz

        if (!foundQuiz || !foundQuiz.isActive) {
          throw new Error("Quiz not found or inactive")
        }

        // Add negative marking properties if not present (for backward compatibility)
        const quizWithNegativeMarking = {
          ...foundQuiz,
          negativeMarking: foundQuiz.negativeMarking ?? true,
          negativeMarkValue: foundQuiz.negativeMarkValue ?? 0.25,
        }

        setQuiz(quizWithNegativeMarking)
        setTimeLeft(foundQuiz.duration * 60) // Convert minutes to seconds
      } catch (error) {
        console.error("Error loading quiz:", error)
        alert("Quiz not found or inactive")
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    }

    fetchQuiz()
  }, [params.id, router, user, authLoading])

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

    // Store result in localStorage AND send to database
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

    // Save to localStorage for immediate access
    const existingResults = JSON.parse(localStorage.getItem("quizResults") || "[]")
    existingResults.push(result)
    localStorage.setItem("quizResults", JSON.stringify(existingResults))

    // Send to database
    try {
      const saveResponse = await fetch("/api/results", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || "student-token-placeholder"}`,
        },
        body: JSON.stringify({
          quizId: quiz.id,
          quizName: quiz.title,
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
        }),
      })

      if (saveResponse.ok) {
        const saveData = await saveResponse.json()
        console.log("✅ Quiz result saved to database:", saveData.result._id)
        // Update result with database ID
        result._id = saveData.result._id
      } else {
        console.warn("⚠️ Failed to save to database, using localStorage only")
      }
    } catch (error) {
      console.warn("⚠️ Database save failed, using localStorage only:", error)
    }

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

  if (loading || authLoading) {
    return (
      <div className="min-h-screen neu-surface flex items-center justify-center">
        <div className="neu-card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen neu-surface flex items-center justify-center p-4">
        <div className="neu-card p-8 text-center max-w-md w-full">
          <p className="text-muted-foreground mb-4">Please log in to take the quiz</p>
          <Link href="/auth/login">
            <button className="neu-button py-3 px-6 text-sm font-medium text-primary w-full">
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen neu-surface flex items-center justify-center p-4">
        <div className="neu-card p-8 text-center max-w-md w-full">
          <p className="text-muted-foreground mb-4">Quiz not found or inactive</p>
          <Link href="/dashboard">
            <button className="neu-button py-3 px-6 text-sm font-medium text-primary w-full">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const userAnswer = answers.find((a) => a.questionId === currentQuestion.id)

  return (
    <div className="min-h-screen neu-surface">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          {/* Mobile Header */}
          <div className="flex flex-col space-y-4 md:hidden">
            <div className="neu-card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="neu-icon-button p-2">
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave Quiz?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to leave this quiz? Your progress will be lost and you'll need to start over.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Continue Quiz</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBackNavigation}>
                          Yes, Leave Quiz
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <div className="neu-icon-button p-2">
                    <ThemeToggle />
                  </div>
                </div>
                {quiz.duration > 0 && (
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Clock className="h-5 w-5" />
                    <span className={timeLeft < 60 ? "text-red-600 dark:text-red-400" : "text-foreground"}>
                      {formatTime(timeLeft)}
                    </span>
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold neu-text-gradient break-words">{quiz.title}</h1>
                <p className="text-muted-foreground text-sm mt-1 break-words">{quiz.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="neu-button py-3 px-4 w-full text-sm font-medium text-primary">
                    <Home className="h-4 w-4 mr-2" />
                    {getBackButtonText()}
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Leave Quiz?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to leave this quiz? Your progress will be lost and you'll need to start over.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Continue Quiz</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBackNavigation}>
                      Yes, Leave Quiz
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <button 
                onClick={handleSubmit} 
                disabled={submitting} 
                className="neu-button py-3 px-4 w-full text-sm font-medium text-primary disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Quiz"}
              </button>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block">
            <div className="neu-card p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="neu-icon-button p-3 flex-shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave Quiz?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to leave this quiz? Your progress will be lost and you'll need to start over.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Continue Quiz</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBackNavigation}>
                          Yes, Leave Quiz
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <div className="min-w-0">
                    <h1 className="text-2xl lg:text-3xl font-bold neu-text-gradient truncate">{quiz.title}</h1>
                    <p className="text-muted-foreground text-sm lg:text-base break-words">{quiz.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button className="neu-button py-2 px-4 text-sm font-medium text-primary whitespace-nowrap">
                        <Home className="h-4 w-4 mr-2" />
                        {getBackButtonText()}
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Leave Quiz?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to leave this quiz? Your progress will be lost and you'll need to start over.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Continue Quiz</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBackNavigation}>
                          Yes, Leave Quiz
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <div className="neu-icon-button p-2">
                    <ThemeToggle />
                  </div>
                  {quiz.duration > 0 && (
                    <div className="flex items-center gap-2 text-lg font-semibold">
                      <Clock className="h-5 w-5" />
                      <span className={timeLeft < 60 ? "text-red-600 dark:text-red-400" : "text-foreground"}>
                        {formatTime(timeLeft)}
                      </span>
                    </div>
                  )}
                  <button 
                    onClick={handleSubmit} 
                    disabled={submitting}
                    className="neu-button py-2 px-4 text-sm font-medium text-primary whitespace-nowrap disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Quiz"}
                  </button>
                </div>
              </div>
            </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="neu-card p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-xs text-muted-foreground">
                {currentQuestionIndex + 1}/{quiz.questions.length}
              </span>
            </div>
            <Progress value={getProgress()} className="h-2" />
          </div>

          <div className="neu-card p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Answered</span>
              <span className="text-xs text-muted-foreground">
                {getAnsweredCount()}/{quiz.questions.length}
              </span>
            </div>
            <Progress value={(getAnsweredCount() / quiz.questions.length) * 100} className="h-2" />
          </div>
        </div>

        {/* Question */}
        <div className="neu-card mb-6">
          <div className="p-6 pb-4">
            <h2 className="text-lg sm:text-xl font-semibold flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-2">
              <span>Question {currentQuestionIndex + 1}</span>
              <span className="text-sm font-normal text-muted-foreground">({currentQuestion.section})</span>
            </h2>
            <div className="text-sm sm:text-base text-muted-foreground">
              <MathRenderer text={currentQuestion.question} />
            </div>
          </div>
          <div className="px-6 pb-6">
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
              className="space-y-3"
            >
              {currentQuestion.options.map((option, optionIndex) => (
                <div key={optionIndex} className="neu-input-surface p-3 rounded-lg hover:neu-hover transition-all duration-200">
                  <div className="flex items-start space-x-3">
                    <RadioGroupItem 
                      value={optionIndex.toString()} 
                      id={`${currentQuestion.id}-${optionIndex}`} 
                      className="mt-0.5 flex-shrink-0"
                    />
                    <Label 
                      htmlFor={`${currentQuestion.id}-${optionIndex}`} 
                      className="cursor-pointer flex-1 text-sm sm:text-base leading-relaxed"
                    >
                      <MathRenderer text={option} />
                    </Label>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {/* Clear Answer Option */}
            <div className="mt-4">
              <button
                onClick={() => {
                  setAnswers((prev) => prev.filter((a) => a.questionId !== currentQuestion.id))
                }}
                disabled={!userAnswer}
                className="neu-button py-2 px-4 text-sm font-medium text-muted-foreground disabled:opacity-50"
              >
                Clear Answer
              </button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="space-y-4">
          {/* Mobile Navigation */}
          <div className="md:hidden">
            {/* Previous/Next Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={prevQuestion} 
                disabled={currentQuestionIndex === 0}
                className="neu-button py-3 px-4 text-sm font-medium text-primary disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={nextQuestion}
                disabled={currentQuestionIndex === quiz.questions.length - 1}
                className="neu-button py-3 px-4 text-sm font-medium text-primary disabled:opacity-50"
              >
                Next
              </button>
            </div>
            
            {/* Question Numbers Grid */}
            <div className="neu-card p-4">
              <h3 className="text-sm font-medium mb-3 text-muted-foreground">Jump to Question:</h3>
              <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                {quiz.questions.map((_, index) => {
                  const questionAnswer = answers.find((a) => a.questionId === quiz.questions[index].id)
                  const isAnswered = questionAnswer !== undefined
                  const isCurrent = index === currentQuestionIndex

                  return (
                    <button
                      key={index}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`neu-button-sm h-10 text-xs font-medium ${
                        isCurrent ? "neu-button-active" : ""
                      } ${
                        isAnswered ? "bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700" : ""
                      }`}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="neu-card p-6">
              <div className="flex justify-between items-center">
                <button 
                  onClick={prevQuestion} 
                  disabled={currentQuestionIndex === 0}
                  className="neu-button py-2 px-6 text-sm font-medium text-primary disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="flex gap-2 flex-wrap justify-center max-w-2xl overflow-x-auto px-4">
                  {quiz.questions.map((_, index) => {
                    const questionAnswer = answers.find((a) => a.questionId === quiz.questions[index].id)
                    const isAnswered = questionAnswer !== undefined
                    const isCurrent = index === currentQuestionIndex

                    return (
                      <button
                        key={index}
                        onClick={() => setCurrentQuestionIndex(index)}
                        className={`neu-button-sm w-10 h-10 text-xs font-medium flex-shrink-0 ${
                          isCurrent ? "neu-button-active" : ""
                        } ${
                          isAnswered ? "bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700" : ""
                        }`}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </div>

                <button
                  onClick={nextQuestion}
                  disabled={currentQuestionIndex === quiz.questions.length - 1}
                  className="neu-button py-2 px-6 text-sm font-medium text-primary disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
