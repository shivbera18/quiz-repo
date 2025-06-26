"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import AdvancedAnalytics from "@/components/advanced-analytics"

interface QuizResult {
  _id: string
  date: string
  quizName: string
  quizId: string
  totalScore: number
  rawScore: number
  positiveMarks: number
  negativeMarks: number
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  sections: {
    reasoning?: number
    quantitative?: number
    english?: number
  }
  questions: any[]
  answers: Array<{
    questionId: string
    selectedAnswer: string | number
    isCorrect: boolean
    question?: string
    options?: string[]
    correctAnswer?: number | string
  }>
  timeSpent: number
  negativeMarking: boolean
  negativeMarkValue: number
  userId?: string
}

export default function AnalyticsPage() {
  const { user } = useAuth()
  const [results, setResults] = useState<QuizResult[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Function to refresh analytics data
  const refreshData = async () => {
    setRefreshing(true)
    try {
      if (user) {
        const token = localStorage.getItem('authToken')
        if (token) {
          const response = await fetch('/api/results', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const apiData = await response.json()
            if (apiData.results && Array.isArray(apiData.results)) {
              setResults(apiData.results)
              // Update localStorage with fresh data
              localStorage.setItem("quizResults", JSON.stringify(apiData.results))
            }
          }
        }
      }
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const loadResults = async () => {
      try {
        if (typeof window === 'undefined') return
        
        // First try to fetch from API if user is authenticated
        if (user) {
          try {
            const token = localStorage.getItem('authToken')
            if (token) {
              const response = await fetch('/api/results', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
              
              if (response.ok) {
                const apiData = await response.json()
                if (apiData.results && Array.isArray(apiData.results)) {
                  setResults(apiData.results)
                  // Also update localStorage with fresh data
                  localStorage.setItem("quizResults", JSON.stringify(apiData.results))
                  setLoading(false)
                  return
                }
              }
            }
          } catch (apiError) {
            console.warn("Failed to fetch results from API, falling back to localStorage:", apiError)
          }
        }
        
        // Fallback to localStorage if API fails or user not authenticated
        const storedResults = localStorage.getItem("quizResults")
        if (storedResults) {
          const parsedResults = JSON.parse(storedResults)
          // Ensure each result has the answers field
          const normalizedResults = parsedResults.map((result: any) => ({
            ...result,
            answers: result.answers || []
          }))
          setResults(normalizedResults)
        }
      } catch (error) {
        console.error("Error loading quiz results:", error)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [user])

  // Auto-refresh when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        refreshData()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Performance Analytics</h1>
              <p className="text-muted-foreground">Detailed insights into your quiz performance</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={refreshData}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mb-4">
          <Button onClick={refreshData} disabled={refreshing} variant="outline">
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>

        {/* Advanced Analytics Component */}
        <AdvancedAnalytics results={results || []} />
      </div>
    </div>
  )
}
