"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import StudentAnalytics from "@/components/student-analytics"
import { useAuth } from "@/hooks/use-auth"
import { MobilePageHeader } from "@/components/layout/mobile-page-header"

interface AttemptSummary {
  attemptId: string
}

interface AnalyticsResult {
  _id: string
  date: string
  quizName: string
  quizId: string
  totalScore: number
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  timeSpent: number
  sections: Record<string, number>
  answers: Array<{
    questionId: string
    selectedAnswer: number | null
    isCorrect: boolean
    section?: string
    question?: string
    options?: string[]
    correctAnswer?: number
    timeSpent?: number
    isUnanswered?: boolean
  }>
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<AnalyticsResult[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    if (!user) return
    setRefreshing(true)
    try {
      const attemptsResponse = await fetch(`/api/attempts?status=SUBMITTED&_t=${Date.now()}`, {
        headers: { Authorization: `Bearer ${user.token || "student-token-placeholder"}` }
      })
      if (!attemptsResponse.ok) throw new Error("Failed to fetch submitted attempts")
      const attemptsData = await attemptsResponse.json()
      const attempts = (attemptsData.attempts || []) as AttemptSummary[]
      const results = await Promise.all(attempts.map(async ({ attemptId }) => {
        const response = await fetch(`/api/attempts/${attemptId}/result`, {
          headers: { Authorization: `Bearer ${user.token || "student-token-placeholder"}` }
        })
        if (!response.ok) throw new Error(`Failed to fetch result ${attemptId}`)
        const data = await response.json()
        const result = data.result
        return { ...result, answers: result.questions || [] } as AnalyticsResult
      }))
      setResults(results)
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const refreshButton = (
    <Button 
      variant="outline" 
      onClick={fetchData} 
      disabled={refreshing} 
      className="border-4 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.75)] bg-blue-300 dark:bg-blue-400 hover:bg-blue-400 dark:hover:bg-blue-500 font-bold transition-all"
    >
      <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
      <span className="ml-2">Refresh</span>
    </Button>
  )

  const mobileRefreshButton = (
    <Button 
      variant="outline" 
      size="icon"
      onClick={fetchData} 
      disabled={refreshing} 
      className="h-10 w-10 shrink-0 rounded-lg border-4 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.75)] bg-blue-300 dark:bg-blue-400 hover:bg-blue-400 dark:hover:bg-blue-500 transition-all"
    >
      <RefreshCw className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`} />
    </Button>
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile & Desktop Header with Refresh action */}
      <MobilePageHeader 
        title="My Analytics" 
        subtitle="Detailed performance insights and progress tracking"
        backHref="/dashboard"
        action={refreshButton}
        mobileAction={mobileRefreshButton}
      />

      <StudentAnalytics results={results} />
    </div>
  )
}
