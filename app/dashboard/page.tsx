"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"
import {
  BookOpen,
  TrendingUp,
  Clock,
  Target,
  Eye,
  Zap,
  ArrowRight,
  BarChart3,
  History
} from "lucide-react"

interface RecentAttempt {
  _id: string
  date: string
  totalScore: number
  quizName: string
  quizId: string
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  timeSpent: number
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
          }
        } catch (error) {
          console.error("Failed to fetch attempts:", error)
        } finally {
          setLoadingAttempts(false)
        }
      }

      fetchAttempts()

      fetch("/api/quizzes", {
        headers: {
          Authorization: `Bearer ${user.token || "student-token-placeholder"}`,
        },
      })
        .then((res) => res.ok ? res.json() : [])
        .then((data) => {
          const quizzesArray = Array.isArray(data) ? data : (data.value || data)
          const activeQuizzes = quizzesArray.filter((q: Quiz) => q.isActive && q.questions?.length > 0)
          setAvailableQuizzes(activeQuizzes)
        })
        .catch(() => setAvailableQuizzes([]))
    }
  }, [loading, user])

  const attemptedQuizIds = allAttempts.map((attempt) => attempt.quizId).filter(Boolean)
  const unattemptedQuizzes = availableQuizzes.filter((quiz) => !attemptedQuizIds.includes(quiz.id))
  const fullMockTests = unattemptedQuizzes.filter((q) => q.sections.length > 1)
  const sectionalTests = unattemptedQuizzes.filter((q) => q.sections.length === 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

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
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Welcome back, {user.name}
        </h1>
        <p className="text-muted-foreground mt-1">Here's an overview of your progress.</p>
      </motion.div>

      {/* Stats Grid */}
      {!loadingAttempts && allAttempts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-semibold">{allAttempts.length}</p>
                <p className="text-xs text-muted-foreground">Total Attempts</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {(allAttempts.reduce((sum, a) => sum + a.totalScore, 0) / allAttempts.length).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {Math.max(...allAttempts.map(a => a.totalScore)).toFixed(0)}%
                </p>
                <p className="text-xs text-muted-foreground">Best Score</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {(allAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / 60).toFixed(0)}m
                </p>
                <p className="text-xs text-muted-foreground">Study Time</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Link href="/dashboard/full-mock-tests">
          <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer group">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-medium mb-1">Mock Tests</h3>
            <p className="text-xs text-muted-foreground">{fullMockTests.length} available</p>
          </div>
        </Link>
        <Link href="/dashboard/sectional-tests">
          <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer group">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center mb-3 group-hover:bg-green-500/20 transition-colors">
              <Target className="h-5 w-5 text-green-500" />
            </div>
            <h3 className="font-medium mb-1">Sectional</h3>
            <p className="text-xs text-muted-foreground">{sectionalTests.length} available</p>
          </div>
        </Link>
        <Link href="/analytics">
          <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer group">
            <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center mb-3 group-hover:bg-amber-500/20 transition-colors">
              <BarChart3 className="h-5 w-5 text-amber-500" />
            </div>
            <h3 className="font-medium mb-1">Analytics</h3>
            <p className="text-xs text-muted-foreground">View insights</p>
          </div>
        </Link>
        <Link href="/dashboard/attempted-quizzes">
          <div className="p-4 rounded-xl bg-card border border-border hover:border-primary/50 hover:bg-card/80 transition-all cursor-pointer group">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-3 group-hover:bg-violet-500/20 transition-colors">
              <History className="h-5 w-5 text-violet-500" />
            </div>
            <h3 className="font-medium mb-1">History</h3>
            <p className="text-xs text-muted-foreground">{allAttempts.length} completed</p>
          </div>
        </Link>
      </motion.div>

      {/* Recent Attempts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Recent Attempts</h2>
          {recentAttempts.length > 0 && (
            <Link href="/dashboard/attempted-quizzes">
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
        
        <div className="rounded-xl border border-border overflow-hidden">
          {recentAttempts.length > 0 ? (
            <div className="divide-y divide-border">
              {recentAttempts.slice(0, 5).map((attempt) => (
                <div key={attempt._id} className="flex items-center justify-between p-4 hover:bg-card/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{attempt.quizName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(attempt.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      className={`${
                        attempt.totalScore >= 70 
                          ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
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
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No attempts yet. Start a quiz to see your results here!</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}
