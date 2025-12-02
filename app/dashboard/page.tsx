"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import { FlashQuestions } from "@/components/flash-questions"
import { staggerContainer, staggerItem } from "@/components/page-transition"
import {
  BookOpen,
  TrendingUp,
  Clock,
  Target,
  History,
  Eye,
  Zap,
  ArrowRight
} from "lucide-react"

interface RecentAttempt {
  _id: string
  date: string
  totalScore: number
  quizName: string
  quizId: string
  rawScore?: number
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  timeSpent: number
  sections: {
    reasoning: number
    quantitative: number
    english: number
  }
}

interface Quiz {
  id: string
  title: string
  description: string
  duration: number
  sections: string[]
  questions: any[]
  isActive: boolean
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([])
  const [allAttempts, setAllAttempts] = useState<RecentAttempt[]>([])
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)
  const [showFlashQuestions, setShowFlashQuestions] = useState(false)
  const [flashQuestions, setFlashQuestions] = useState<any[]>([])

  // Redirect to login if not authenticated (after hydration)
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login")
    }
  }, [loading, user, router])

  useEffect(() => {
    if (!loading && user) {
      const fetchAttempts = async () => {
        try {
          const response = await fetch("/api/results", {
            headers: {
              Authorization: `Bearer ${user.token || "student-token-placeholder"}`,
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          })

          if (response.ok) {
            const data = await response.json()
            const attempts = data.results || []
            const sortedAttempts = attempts.sort((a: any, b: any) =>
              new Date(b.date).getTime() - new Date(a.date).getTime()
            )

            setAllAttempts(sortedAttempts)
            setRecentAttempts(sortedAttempts.slice(0, 5))
          } else {
            const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
            const sortedResults = results
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

            setAllAttempts(sortedResults)
            setRecentAttempts(sortedResults.slice(0, 5))
          }
        } catch (error) {
          console.error("Failed to fetch attempts:", error)
          const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
          const sortedResults = results
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

          setAllAttempts(sortedResults)
          setRecentAttempts(sortedResults.slice(0, 5))
        } finally {
          setLoadingAttempts(false)
        }
      }

      fetchAttempts()

      fetch("/api/quizzes", {
        headers: {
          Authorization: `Bearer ${user.token || "student-token-placeholder"}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
        .then((res) => res.ok ? res.json() : [])
        .then((data) => {
          const quizzesArray = Array.isArray(data) ? data : (data.value || data)
          const activeQuizzes = quizzesArray.filter((q: Quiz) => q.isActive && q.questions?.length > 0)
          setAvailableQuizzes(activeQuizzes)

          const allQuestions = activeQuizzes.flatMap((quiz: Quiz) =>
            quiz.questions?.map((q: any) => ({
              id: q.id || Math.random().toString(),
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              section: q.section || 'General'
            })) || []
          )

          const shuffled = allQuestions.sort(() => Math.random() - 0.5)
          setFlashQuestions(shuffled.slice(0, 10))
        })
        .catch((error) => {
          console.error("Error fetching quizzes:", error)
          setAvailableQuizzes([])
        })
    }
  }, [loading, user])

  const attemptedQuizIds = allAttempts.map((attempt: RecentAttempt) => attempt.quizId).filter(Boolean)
  const unattemptedQuizzes = availableQuizzes.filter((quiz: Quiz) => !attemptedQuizIds.includes(quiz.id))
  const fullMockTests = unattemptedQuizzes.filter((q: Quiz) => q.sections.length > 1)
  const sectionalTests = unattemptedQuizzes.filter((q: Quiz) => q.sections.length === 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  // If not authenticated after hydration, show brief loading while redirecting
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight">Welcome back, {user.name}</h1>
        <p className="text-muted-foreground font-medium">Here&apos;s an overview of your progress.</p>
      </div>

      {/* Quick Stats Bar - Neo Brutalism */}
      {!loadingAttempts && allAttempts.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#fff] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] dark:hover:shadow-[12px_12px_0px_0px_#fff] transition-all">
            <div className="p-3 rounded-lg bg-blue-300 dark:bg-blue-400 border-2 border-black dark:border-white">
              <BookOpen className="h-6 w-6 text-black" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold">Total Attempts</p>
              <p className="text-2xl font-black">{allAttempts.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#fff] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] dark:hover:shadow-[12px_12px_0px_0px_#fff] transition-all">
            <div className="p-3 rounded-lg bg-green-300 dark:bg-green-400 border-2 border-black dark:border-white">
              <TrendingUp className="h-6 w-6 text-black" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold">Avg Score</p>
              <p className="text-2xl font-black">
                {(allAttempts.reduce((sum, a) => sum + a.totalScore, 0) / allAttempts.length).toFixed(2)}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#fff] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] dark:hover:shadow-[12px_12px_0px_0px_#fff] transition-all">
            <div className="p-3 rounded-lg bg-yellow-300 dark:bg-yellow-400 border-2 border-black dark:border-white">
              <Target className="h-6 w-6 text-black" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold">Best Score</p>
              <p className="text-2xl font-black">{Math.max(...allAttempts.map(a => a.totalScore)).toFixed(2)}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-900 rounded-lg border-4 border-black dark:border-white shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#fff] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] dark:hover:shadow-[12px_12px_0px_0px_#fff] transition-all">
            <div className="p-3 rounded-lg bg-purple-300 dark:bg-purple-400 border-2 border-black dark:border-white">
              <Clock className="h-6 w-6 text-black" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-bold">Study Time</p>
              <p className="text-2xl font-black">
                {(allAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / 60).toFixed(0)}m
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card variant="neobrutalist" className="lg:col-span-2">
          {showFlashQuestions ? (
            <CardContent className="p-6">
              <Button
                variant="ghost"
                onClick={() => setShowFlashQuestions(false)}
                className="mb-4"
              >
                ← Back
              </Button>
              <FlashQuestions questions={flashQuestions} />
            </CardContent>
          ) : (
            <>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Quick Practice</CardTitle>
                    <CardDescription className="mt-1">Lightning-fast quiz session</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setShowFlashQuestions(true)}
                  className="w-full"
                  disabled={flashQuestions.length === 0}
                >
                  Start Flash Questions
                </Button>
              </CardContent>
            </>
          )}
        </Card>

        <Link href="/dashboard/full-mock-tests">
          <Card variant="neobrutalist" className="cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>Full Mock Tests</CardTitle>
              </div>
              <CardDescription>Comprehensive practice exams</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{fullMockTests.length} Available</Badge>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/sectional-tests">
          <Card variant="neobrutalist" className="cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-5 w-5 text-primary" />
                <CardTitle>Sectional Tests</CardTitle>
              </div>
              <CardDescription>Topic-specific practice</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{sectionalTests.length} Available</Badge>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/attempted-quizzes">
          <Card variant="neobrutalist" className="cursor-pointer h-full">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-primary" />
                <CardTitle>History</CardTitle>
              </div>
              <CardDescription>Review past attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <Badge variant="secondary">{allAttempts.length} Completed</Badge>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6">
        <Card variant="neobrutalist">
          <CardHeader>
            <CardTitle>Recent Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttempts.length > 0 ? (
              <div className="space-y-4">
                {recentAttempts.map((attempt) => (
                  <div key={attempt._id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{attempt.quizName}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(attempt.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link href={`/results/${attempt._id}`}>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Badge variant={attempt.totalScore >= 70 ? "default" : "secondary"}>
                        {attempt.totalScore}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No attempts yet. Start a quiz to see your results here!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

