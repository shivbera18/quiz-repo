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
import NotificationPermissionPopup from "@/components/notification-permission-popup"
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
  const [showNotificationPopup, setShowNotificationPopup] = useState(false)
  const [notificationTimer, setNotificationTimer] = useState<NodeJS.Timeout | null>(null)

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

  // Show notification permission popup after a delay
  useEffect(() => {
    if (!user || loading) {
      if (notificationTimer) {
        clearTimeout(notificationTimer)
        setNotificationTimer(null)
      }
      return
    }

    // Check if popup was recently dismissed
    const dismissedAt = localStorage.getItem('notification-popup-dismissed')
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt)
      const hoursSinceDismissed = (Date.now() - dismissedTime) / (1000 * 60 * 60)
      // Don't show again for 24 hours
      if (hoursSinceDismissed < 24) return
    }

    // Clear any existing timer
    if (notificationTimer) {
      clearTimeout(notificationTimer)
    }

    // Show popup after 3 seconds delay, but only if not already subscribed
    const timer = setTimeout(() => {
      // Double-check subscription status before showing
      const checkAndShow = async () => {
        try {
          // Check if notifications are supported
          const hasNotificationSupport = typeof window !== 'undefined' && 'Notification' in window
          const hasServiceWorker = typeof navigator !== 'undefined' && 'serviceWorker' in navigator
          const hasPushManager = typeof window !== 'undefined' && 'PushManager' in window

          if (hasNotificationSupport && hasServiceWorker && hasPushManager) {
            const registration = await navigator.serviceWorker.ready
            const subscription = await registration.pushManager.getSubscription()
            const permission = Notification.permission

            // Only show if not subscribed AND permission is not denied AND permission is not already granted (would be auto-subscribed)
            if (!subscription && permission !== 'denied' && permission !== 'granted') {
              setShowNotificationPopup(true)
            }
          } else {
            // If APIs aren't available, don't show popup to avoid confusion
            console.log('Push notifications not fully supported')
          }
        } catch (error) {
          // If we can't check, don't show the popup to avoid errors
          console.log('Could not check notification status:', error)
        }
      }

      checkAndShow()
    }, 3000)

    setNotificationTimer(timer)

    return () => {
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [user, loading, notificationTimer])

  const attemptedQuizIds = allAttempts.map(attempt => attempt.quizId)
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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white dark:bg-zinc-900 rounded-lg border-4 border-black dark:border-white/65 shadow-[6px_6px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.65)] sm:dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.75)] transition-all">
            <div className="p-2 rounded-lg bg-blue-300 dark:bg-blue-400 border-2 border-black dark:border-white/65 flex-shrink-0">
              <BookOpen className="h-5 w-5 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-bold">Total Attempts</p>
              <p className="text-xl sm:text-2xl font-black">{allAttempts.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white dark:bg-zinc-900 rounded-lg border-4 border-black dark:border-white/65 shadow-[6px_6px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.65)] sm:dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.75)] transition-all">
            <div className="p-2 rounded-lg bg-green-300 dark:bg-green-400 border-2 border-black dark:border-white/65 flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-bold">Avg Score</p>
              <p className="text-xl sm:text-2xl font-black truncate">
                {(allAttempts.reduce((sum, a) => sum + a.totalScore, 0) / allAttempts.length).toFixed(0)}%
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white dark:bg-zinc-900 rounded-lg border-4 border-black dark:border-white/65 shadow-[6px_6px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.65)] sm:dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.75)] transition-all">
            <div className="p-2 rounded-lg bg-yellow-300 dark:bg-yellow-400 border-2 border-black dark:border-white/65 flex-shrink-0">
              <Target className="h-5 w-5 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-bold">Best Score</p>
              <p className="text-xl sm:text-2xl font-black truncate">{Math.max(...allAttempts.map(a => a.totalScore)).toFixed(0)}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-white dark:bg-zinc-900 rounded-lg border-4 border-black dark:border-white/65 shadow-[6px_6px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.65)] sm:dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.75)] transition-all">
            <div className="p-2 rounded-lg bg-purple-300 dark:bg-purple-400 border-2 border-black dark:border-white/65 flex-shrink-0">
              <Clock className="h-5 w-5 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-bold">Study Time</p>
              <p className="text-xl sm:text-2xl font-black">
                {(allAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / 60).toFixed(0)}m
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Flash Questions Modal/Expanded View */}
      <FlashQuestions
        isOpen={showFlashQuestions}
        onClose={() => setShowFlashQuestions(false)}
        questions={flashQuestions}
      />

      {/* Action Cards Grid - 2 per row on desktop */}
      {!showFlashQuestions && (
        <div className="grid gap-4 grid-cols-2">
          {/* Quick Practice */}
          <Card 
            variant="neobrutalist" 
            className="cursor-pointer hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
            onClick={() => setShowFlashQuestions(true)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-yellow-300 dark:bg-yellow-400 border-2 border-black">
                  <Zap className="h-4 w-4 text-black" />
                </div>
                <CardTitle className="text-base">Quick Practice</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-muted-foreground mb-2">Flash questions</p>
              <Badge variant="secondary" className="text-xs">{flashQuestions.length} Questions</Badge>
            </CardContent>
          </Card>

          {/* Full Mock Tests */}
          <Link href="/dashboard/full-mock-tests">
            <Card variant="neobrutalist" className="cursor-pointer h-full hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-300 dark:bg-blue-400 border-2 border-black">
                    <BookOpen className="h-4 w-4 text-black" />
                  </div>
                  <CardTitle className="text-base">Mock Tests</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-2">Full practice exams</p>
                <Badge variant="secondary" className="text-xs">{fullMockTests.length} Available</Badge>
              </CardContent>
            </Card>
          </Link>

          {/* Sectional Tests */}
          <Link href="/dashboard/sectional-tests">
            <Card variant="neobrutalist" className="cursor-pointer h-full hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-300 dark:bg-green-400 border-2 border-black">
                    <Target className="h-4 w-4 text-black" />
                  </div>
                  <CardTitle className="text-base">Sectional</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-2">Topic practice</p>
                <Badge variant="secondary" className="text-xs">{sectionalTests.length} Available</Badge>
              </CardContent>
            </Card>
          </Link>

          {/* History */}
          <Link href="/dashboard/attempted-quizzes">
            <Card variant="neobrutalist" className="cursor-pointer h-full hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-300 dark:bg-purple-400 border-2 border-black">
                    <History className="h-4 w-4 text-black" />
                  </div>
                  <CardTitle className="text-base">History</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-2">Past attempts</p>
                <Badge variant="secondary" className="text-xs">{allAttempts.length} Completed</Badge>
              </CardContent>
            </Card>
          </Link>
        </div>
      )}

      {/* Recent Attempts */}
      {!showFlashQuestions && (
        <Card variant="neobrutalist">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Recent Attempts</CardTitle>
              {recentAttempts.length > 0 && (
                <Link href="/dashboard/attempted-quizzes">
                  <Button variant="ghost" size="sm" className="text-xs gap-1">
                    View All <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAttempts.length > 0 ? (
              <div className="space-y-2">
                {recentAttempts.slice(0, 3).map((attempt) => (
                  <div key={attempt._id} className="flex items-center justify-between p-3 rounded-lg border-2 border-black dark:border-white/65 bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{attempt.quizName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(attempt.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={`text-xs font-bold ${
                          attempt.totalScore >= 70 
                            ? 'bg-green-400 text-black border-black' 
                            : 'bg-orange-400 text-black border-black'
                        }`}
                      >
                        {Math.round(attempt.totalScore)}%
                      </Badge>
                      <Link href={`/results/${attempt._id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                No attempts yet. Start a quiz to see your results here!
              </p>
            )}
          </CardContent>
        </Card>
      )}
      
      {/* Notification Permission Popup */}
      <NotificationPermissionPopup
        isOpen={showNotificationPopup}
        onClose={() => setShowNotificationPopup(false)}
      />
    </div>
  )
}

