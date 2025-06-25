"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
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
  user?: {
    id: string
    name: string
    email: string
  }
  quiz?: {
    id: string
    title: string
  }
}

export default function AdvancedAnalyticsPage() {
  const { user, loading } = useAuth(true)
  const [results, setResults] = useState<QuizResult[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && user) {
      fetchAnalytics()
    }
  }, [loading, user])

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch("/api/admin/analytics")
      
      if (!response.ok) {
        throw new Error("Failed to fetch analytics")
      }

      const data = await response.json()
      console.log("Fetched analytics data:", data)
      
      // Transform the data to match our QuizResult interface
      const transformedResults = (data.results || []).map((result: any) => ({
        _id: result.id || result._id || '',
        date: result.createdAt || result.date || new Date().toISOString(),
        quizName: result.quiz?.title || result.quizName || 'Unknown Quiz',
        quizId: result.quizId || result.quiz?.id || '',
        totalScore: result.totalScore || 0,
        rawScore: result.rawScore || result.totalScore || 0,
        positiveMarks: result.positiveMarks || result.totalScore || 0,
        negativeMarks: result.negativeMarks || 0,
        correctAnswers: result.correctAnswers || 0,
        wrongAnswers: result.wrongAnswers || 0,
        unanswered: result.unanswered || 0,
        sections: result.sections || {},
        answers: result.answers || [],
        timeSpent: result.timeSpent || 0,
        negativeMarking: result.negativeMarking || false,
        negativeMarkValue: result.negativeMarkValue || 0,
        user: result.user,
        quiz: result.quiz
      }))
      
      setResults(transformedResults)
      
      // If no API data, try localStorage as fallback
      if (transformedResults.length === 0) {
        try {
          if (typeof window !== 'undefined') {
            const localResults = localStorage.getItem("quizResults")
            if (localResults) {
              const parsedResults = JSON.parse(localResults)
              setResults(parsedResults)
            }
          }
        } catch (localError) {
          console.warn("Error loading local data:", localError)
        }
      }
      
    } catch (error) {
      console.error("Error fetching analytics:", error)
      setError("Failed to load analytics data. Trying fallback...")
      
      // Fallback to localStorage
      try {
        if (typeof window !== 'undefined') {
          const localResults = localStorage.getItem("quizResults")
          if (localResults) {
            const parsedResults = JSON.parse(localResults)
            setResults(parsedResults)
            setError(null) // Clear error if fallback works
          }
        }
      } catch (fallbackError) {
        console.warn("Fallback also failed:", fallbackError)
        setError("Failed to load analytics data from all sources.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading advanced analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/admin/analytics">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Advanced Analytics</h1>
              <p className="text-muted-foreground">Comprehensive insights and performance analysis</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-center gap-2">
              <div className="text-red-600">{error}</div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchAnalytics}
                className="ml-auto"
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Advanced Analytics Component */}
        <AdvancedAnalytics results={results} />
      </div>
    </div>
  )
}
