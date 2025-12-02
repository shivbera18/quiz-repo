"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Clock, ArrowLeft, Send, ChevronLeft, ChevronRight, X, Bookmark, CheckCheck, Grid3x3, Save } from "lucide-react"
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/hooks/use-auth"
import MathRenderer from "@/components/math-renderer"
import { cn } from "@/lib/utils"

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
  selectedAnswer: number | null
}

interface QuestionStatus {
  answered: boolean
  markedForReview: boolean
}

export default function QuizPage({ params }: { params: { id: string } }) {
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [questionStatuses, setQuestionStatuses] = useState<Record<string, QuestionStatus>>({})
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showNavigator, setShowNavigator] = useState(false)
  // Time tracking per question
  const [questionTimes, setQuestionTimes] = useState<Record<string, number>>({})
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now())
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const getBackUrl = () => {
    const fromSubject = searchParams.get('fromSubject')
    const fromChapter = searchParams.get('fromChapter')
    if (fromSubject && fromChapter) return `/dashboard/sectional-tests/${fromSubject}/${fromChapter}`
    else if (fromSubject) return `/dashboard/sectional-tests/${fromSubject}`
    return '/dashboard'
  }

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const response = await fetch(`/api/quizzes/${params.id}`, {
          headers: { Authorization: `Bearer ${user?.token || "student-token-placeholder"}` },
        })
        if (!response.ok) throw new Error("Failed to fetch quiz")
        const data = await response.json()
        // API returns { quiz: { ... } } — support both shapes for compatibility
        const quizData = (data && data.quiz) ? data.quiz : data
        setQuiz(quizData)
        setTimeLeft((quizData.duration || quizData.timeLimit || 0) * 60)

        // Initialize question statuses
        const statuses: Record<string, QuestionStatus> = {}
          ; (quizData.questions || []).forEach((q: Question) => {
            statuses[q.id] = { answered: false, markedForReview: false }
          })
        setQuestionStatuses(statuses)
      } catch (error) {
        console.error(error)
        router.push("/dashboard")
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading && user) fetchQuiz()
  }, [params.id, user, authLoading, router])

  useEffect(() => {
    if (!quiz || timeLeft <= 0) return
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [quiz, timeLeft])

  // Record time spent on current question before moving to another
  const recordTimeOnCurrentQuestion = () => {
    if (!quiz) return
    const currentQuestion = quiz.questions[currentQuestionIndex]
    const timeSpentOnQuestion = Date.now() - questionStartTime

    setQuestionTimes(prev => ({
      ...prev,
      [currentQuestion.id]: (prev[currentQuestion.id] || 0) + timeSpentOnQuestion
    }))

    // Reset start time for next question
    setQuestionStartTime(Date.now())
  }

  // Navigate to a specific question index with time tracking
  const navigateToQuestion = (newIndex: number) => {
    if (newIndex === currentQuestionIndex) return
    recordTimeOnCurrentQuestion()
    setCurrentQuestionIndex(newIndex)
  }

  const handleAnswerChange = (questionId: string, selectedAnswer: number) => {
    setAnswers((prev) => {
      const existing = prev.find((a) => a.questionId === questionId)
      if (existing) {
        return prev.map((a) => (a.questionId === questionId ? { ...a, selectedAnswer } : a))
      }
      return [...prev, { questionId, selectedAnswer }]
    })

    // Update status to answered
    setQuestionStatuses(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], answered: true }
    }))
  }

  const handleMarkForReview = () => {
    const currentQuestion = quiz!.questions[currentQuestionIndex]
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.id]: { ...prev[currentQuestion.id], markedForReview: true }
    }))
    // Auto-advance to next question with time tracking
    if (currentQuestionIndex < quiz!.questions.length - 1) {
      navigateToQuestion(currentQuestionIndex + 1)
    }
  }

  const handleSaveAndMarkForReview = () => {
    const currentQuestion = quiz!.questions[currentQuestionIndex]
    const userAnswer = answers.find(a => a.questionId === currentQuestion.id)

    if (userAnswer) {
      setQuestionStatuses(prev => ({
        ...prev,
        [currentQuestion.id]: { ...prev[currentQuestion.id], markedForReview: true }
      }))
      // Auto-advance to next question with time tracking
      if (currentQuestionIndex < quiz!.questions.length - 1) {
        navigateToQuestion(currentQuestionIndex + 1)
      }
    }
  }

  const handleClearResponse = () => {
    const currentQuestion = quiz!.questions[currentQuestionIndex]
    setAnswers(prev => prev.filter(a => a.questionId !== currentQuestion.id))
    setQuestionStatuses(prev => ({
      ...prev,
      [currentQuestion.id]: { ...prev[currentQuestion.id], answered: false }
    }))
  }

  const handleSaveAndNext = () => {
    // Only advance if there's an answer (already saved/green)
    if (userAnswer && currentQuestionIndex < quiz!.questions.length - 1) {
      navigateToQuestion(currentQuestionIndex + 1)
    }
  }

  const handleSubmit = async () => {
    if (!quiz || submitting) return
    setSubmitting(true)

    // Record time for the current question before submitting
    recordTimeOnCurrentQuestion()

    // Get final time data
    const finalQuestionTimes = { ...questionTimes }
    // Add time for current question if not already recorded
    const currentQuestion = quiz.questions[currentQuestionIndex]
    if (!finalQuestionTimes[currentQuestion.id]) {
      finalQuestionTimes[currentQuestion.id] = Date.now() - questionStartTime
    }

    const scoreData = {
      correctAnswers: 0,
      wrongAnswers: 0,
      unanswered: 0,
      totalScore: 0,
      rawScore: 0,
    }

    const sectionPercentages: Record<string, number> = {}
    const sectionStats: Record<string, { correct: number; total: number }> = {}
    const questionResults: any[] = []

    quiz.questions.forEach((question) => {
      if (!sectionStats[question.section]) {
        sectionStats[question.section] = { correct: 0, total: 0 }
      }
      sectionStats[question.section].total++
    })

    quiz.questions.forEach((question) => {
      const userAnswer = answers.find((a) => a.questionId === question.id)
      const hasAnswered = userAnswer && userAnswer.selectedAnswer !== null && userAnswer.selectedAnswer !== undefined
      const isCorrect = hasAnswered && userAnswer.selectedAnswer === question.correctAnswer

      if (!hasAnswered) {
        // Question was not answered (unanswered/skipped)
        scoreData.unanswered++
      } else if (isCorrect) {
        scoreData.correctAnswers++
        scoreData.rawScore++
        sectionStats[question.section].correct++
      } else {
        // Answered but wrong
        scoreData.wrongAnswers++
        if (quiz.negativeMarking) {
          scoreData.rawScore -= quiz.negativeMarkValue
        }
      }

      questionResults.push({
        questionId: question.id,
        question: question.question,
        userAnswer: hasAnswered ? userAnswer.selectedAnswer : null,
        correctAnswer: question.correctAnswer,
        isCorrect: isCorrect || false,
        isUnanswered: !hasAnswered,
        section: question.section,
        timeSpent: finalQuestionTimes[question.id] || 0, // Time in milliseconds
      })
    })

    Object.keys(sectionStats).forEach((section) => {
      const { correct, total } = sectionStats[section]
      sectionPercentages[section] = total > 0 ? (correct / total) * 100 : 0
    })

    scoreData.totalScore = Math.max(0, (scoreData.rawScore / quiz.questions.length) * 100)

    const tempId = Date.now().toString()
    const result = {
      _id: tempId,
      quizId: quiz.id,
      quizName: quiz.title,
      date: new Date().toISOString(),
      ...scoreData,
      sections: sectionPercentages,
      questions: questionResults,
      timeSpent: quiz.duration ? quiz.duration * 60 - timeLeft : 0,
      negativeMarking: quiz.negativeMarking,
      negativeMarkValue: quiz.negativeMarkValue,
    }

    const existingResults = JSON.parse(localStorage.getItem("quizResults") || "[]")
    existingResults.push(result)
    localStorage.setItem("quizResults", JSON.stringify(existingResults))

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
          ...scoreData,
          sections: sectionPercentages,
          questions: questionResults,
          timeSpent: quiz.duration ? quiz.duration * 60 - timeLeft : 0,
          negativeMarking: quiz.negativeMarking,
          negativeMarkValue: quiz.negativeMarkValue,
        }),
      })

      if (saveResponse.ok) {
        const saveData = await saveResponse.json()
        const serverId = saveData.result._id
        result._id = serverId
        
        // Update the ID in localStorage to match the server ID
        // This ensures that if the user navigates to the result page with the server ID,
        // they can still find the result in localStorage if the API fails (fallback)
        const currentResults = JSON.parse(localStorage.getItem("quizResults") || "[]")
        const updatedResults = currentResults.map((r: any) => 
          r._id === tempId ? { ...r, _id: serverId } : r
        )
        localStorage.setItem("quizResults", JSON.stringify(updatedResults))
      }
    } catch (error) {
      console.warn("Database save failed", error)
    }

    router.push(`/results/${result._id}`)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getQuestionStatusColor = (questionId: string) => {
    const status = questionStatuses[questionId]
    const isAnswered = answers.some(a => a.questionId === questionId)

    if (isAnswered && status?.markedForReview) {
      return "bg-purple-500 text-white border-purple-600" // Purple with tick: saved & marked
    } else if (status?.markedForReview) {
      return "bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500" // Purple: marked for review
    } else if (isAnswered) {
      return "bg-green-500 text-white border-green-600" // Green: saved
    } else {
      return "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500" // Red: not visited
    }
  }

  if (loading || authLoading || !quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const userAnswer = answers.find((a) => a.questionId === currentQuestion.id)
  const currentStatus = questionStatuses[currentQuestion.id]

  const answeredCount = Object.values(questionStatuses).filter(s => s.answered).length
  const markedCount = Object.values(questionStatuses).filter(s => s.markedForReview).length

  return (
    <div className="min-h-screen bg-background">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 w-full border-b-4 border-black bg-background/95 backdrop-blur dark:border-white/20">
        <div className="container flex h-16 sm:h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-9 sm:w-9">
                  <ArrowLeft className="h-5 w-5 sm:h-4 sm:w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Quit Quiz?</AlertDialogTitle>
                  <AlertDialogDescription>Your progress will be lost.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => router.push(getBackUrl())} className="w-full sm:w-auto">Quit</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="font-semibold truncate max-w-[120px] sm:max-w-[200px] lg:max-w-md text-sm sm:text-base">
              {quiz.title}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={cn(
              "flex items-center gap-1.5 sm:gap-2 font-mono text-xs sm:text-sm font-medium px-2 sm:px-3 py-1 rounded-full bg-muted",
              timeLeft < 60 && "text-destructive bg-destructive/10"
            )}>
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {formatTime(timeLeft)}
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="neobrutalist" size="sm" className="gap-1.5 h-9 sm:h-8">
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline text-sm">Submit</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg">
                <AlertDialogHeader>
                  <AlertDialogTitle>Submit Quiz?</AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="text-sm space-y-2 text-muted-foreground">
                      <p>Answered: {answeredCount}/{quiz.questions.length} | Marked for Review: {markedCount}</p>
                      {answeredCount < quiz.questions.length && <p className="text-destructive">Warning: {quiz.questions.length - answeredCount} questions unanswered</p>}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
                  <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSubmit} disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? "Submitting..." : "Submit Quiz"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
        <Progress value={((currentQuestionIndex + 1) / quiz.questions.length) * 100} className="h-1" />
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 pb-40 sm:pb-32">
          <div className="container max-w-5xl py-4 sm:py-6 px-4 lg:px-8">
            <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              <span className="font-medium">Question {currentQuestionIndex + 1} of {quiz.questions.length}</span>
              <div className="flex items-center gap-2 sm:gap-4">
                <span className="capitalize hidden sm:inline">{currentQuestion.section}</span>
                <Sheet open={showNavigator} onOpenChange={setShowNavigator}>
                  <SheetTrigger asChild>
                    <Button variant="neobrutalist" size="sm" className="h-9 gap-2">
                      <Grid3x3 className="h-4 w-4" />
                      <span className="hidden xs:inline">Questions</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:w-96 overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Question Palette</SheetTitle>
                    </SheetHeader>
                    <div className="mt-6 space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded bg-green-500" />
                          <span>Answered</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded bg-red-500/20 border border-red-500" />
                          <span>Not Answered</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded bg-purple-500/20 border border-purple-500" />
                          <span>Marked</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded bg-purple-500 flex items-center justify-center">
                            <CheckCheck className="h-3 w-3 text-white" />
                          </div>
                          <span>Answered & Marked</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {quiz.questions.map((q, idx) => {
                          const isCurrent = idx === currentQuestionIndex
                          const isAnswered = answers.some(a => a.questionId === q.id)
                          const status = questionStatuses[q.id]

                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                navigateToQuestion(idx)
                                setShowNavigator(false)
                              }}
                              className={cn(
                                "relative h-12 w-full rounded-lg border-2 font-bold transition-all flex items-center justify-center shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]",
                                isCurrent && "ring-2 ring-black ring-offset-2 dark:ring-white",
                                getQuestionStatusColor(q.id)
                              )}
                            >
                              {idx + 1}
                              {isAnswered && status?.markedForReview && (
                                <CheckCheck className="absolute bottom-0.5 right-0.5 h-3 w-3" />
                              )}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="bg-card p-4 sm:p-6 border rounded-lg">
                  <div className="text-lg sm:text-xl lg:text-2xl font-medium leading-relaxed mb-6 sm:mb-8">
                    <MathRenderer text={currentQuestion.question} />
                  </div>

                  {currentQuestion.image && (
                    <div className="mb-6 sm:mb-8 rounded-xl overflow-hidden border">
                      <img
                        src={currentQuestion.image}
                        alt="Question"
                        className="w-full h-auto object-contain max-h-[300px] sm:max-h-[400px]"
                      />
                    </div>
                  )}

                  <div className="space-y-3">
                    {currentQuestion.options.map((option, idx) => {
                      const isSelected = userAnswer?.selectedAnswer === idx
                      return (
                        <div
                          key={idx}
                          onClick={() => handleAnswerChange(currentQuestion.id, idx)}
                          className={cn(
                            "flex items-center gap-3 sm:gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 active:scale-[0.99]",
                            isSelected
                              ? "border-black bg-primary/10 shadow-[4px_4px_0px_0px_#000] dark:border-white dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)]"
                              : "border-black/20 hover:border-black hover:shadow-[4px_4px_0px_0px_#000] hover:bg-background dark:border-white/20 dark:hover:border-white dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]"
                          )}
                        >
                          <div className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            isSelected ? "border-black bg-black text-white dark:border-white dark:bg-white dark:text-black" : "border-black/20"
                          )}>
                            {isSelected && <div className="h-3 w-3 rounded-full bg-current" />}
                          </div>
                          <div className="flex-1 text-sm sm:text-base font-medium">
                            <MathRenderer text={option} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop Question Navigator - Right Side */}
        <div className="hidden lg:block w-80 border-l h-[calc(100vh-57px)] sticky top-[57px] overflow-y-auto bg-muted/30">
          <div className="p-4 space-y-4">
            <div>
              <h3 className="font-semibold mb-1">Question Palette</h3>
              <p className="text-xs text-muted-foreground">
                {answeredCount} answered • {markedCount} marked
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-green-500" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-red-500/20 border border-red-500" />
                <span>Not Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-purple-500/20 border border-purple-500" />
                <span>Marked</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded bg-purple-500 flex items-center justify-center">
                  <CheckCheck className="h-3 w-3 text-white" />
                </div>
                <span>Ans & Marked</span>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {quiz.questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex
                const isAnswered = answers.some(a => a.questionId === q.id)
                const status = questionStatuses[q.id]

                return (
                  <button
                    key={idx}
                    onClick={() => navigateToQuestion(idx)}
                    className={cn(
                      "relative h-10 w-full rounded-lg border-2 text-sm font-bold transition-all flex items-center justify-center shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_#000] active:translate-x-[0px] active:translate-y-[0px] active:shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.15)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]",
                      isCurrent && "ring-2 ring-black ring-offset-2 dark:ring-white",
                      getQuestionStatusColor(q.id)
                    )}
                  >
                    {idx + 1}
                    {isAnswered && status?.markedForReview && (
                      <CheckCheck className="absolute bottom-0.5 right-0.5 h-2.5 w-2.5" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:right-80 border-t-4 border-black bg-background/95 backdrop-blur p-3 sm:p-4 z-30 dark:border-white/20">
        <div className="container max-w-5xl">
          {/* Desktop Layout */}
          <div className="hidden sm:flex items-center justify-between gap-4">
            <div className="flex gap-2">
              <Button
                variant="neobrutalist"
                onClick={() => navigateToQuestion(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="h-10 px-4"
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Previous
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="neobrutalist"
                onClick={handleClearResponse}
                disabled={!userAnswer}
                className="h-10"
              >
                Clear
              </Button>
              <Button
                variant="neobrutalist"
                onClick={handleMarkForReview}
                className="h-10 gap-2"
              >
                <Bookmark className="h-4 w-4" />
                Mark for Review
              </Button>
              <Button
                variant="neobrutalistInverted"
                onClick={handleSaveAndMarkForReview}
                disabled={!userAnswer}
                className="h-10 gap-2 bg-purple-600 hover:bg-purple-700 text-white border-purple-900"
              >
                <CheckCheck className="h-4 w-4" />
                Save & Mark
              </Button>
              <Button
                variant="neobrutalistInverted"
                onClick={handleSaveAndNext}
                disabled={!userAnswer || currentQuestionIndex === quiz.questions.length - 1}
                className="h-10 gap-2 bg-green-600 hover:bg-green-700 text-white border-green-900"
              >
                <Save className="h-4 w-4" />
                Save & Next
              </Button>
            </div>

            <Button
              variant="neobrutalist"
              onClick={() => navigateToQuestion(Math.min(quiz.questions.length - 1, currentQuestionIndex + 1))}
              disabled={currentQuestionIndex === quiz.questions.length - 1}
              className="h-10 px-4"
            >
              Next <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          {/* Mobile Layout */}
          <div className="sm:hidden space-y-1.5">
            <div className="flex gap-1.5">
              <Button
                variant="outline"
                onClick={handleClearResponse}
                disabled={!userAnswer}
                className="flex-1 h-9 text-xs"
              >
                Clear
              </Button>
              <Button
                variant="outline"
                onClick={handleMarkForReview}
                className="flex-1 h-9 gap-1.5 text-xs"
              >
                <Bookmark className="h-3.5 w-3.5" />
                Mark
              </Button>
              <Button
                variant="default"
                onClick={handleSaveAndMarkForReview}
                disabled={!userAnswer}
                className="flex-1 h-9 gap-1.5 text-xs bg-purple-600 hover:bg-purple-700"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Save & Mark
              </Button>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="default"
                onClick={handleSaveAndNext}
                disabled={!userAnswer || currentQuestionIndex === quiz.questions.length - 1}
                className="flex-1 h-9 gap-1.5 text-xs bg-green-600 hover:bg-green-700"
              >
                <Save className="h-3.5 w-3.5" />
                Save & Next
              </Button>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="ghost"
                onClick={() => navigateToQuestion(Math.max(0, currentQuestionIndex - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex-1 h-9 text-xs"
              >
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Prev
              </Button>
              <Button
                onClick={() => navigateToQuestion(Math.min(quiz.questions.length - 1, currentQuestionIndex + 1))}
                disabled={currentQuestionIndex === quiz.questions.length - 1}
                className="flex-1 h-9 text-xs"
              >
                Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
