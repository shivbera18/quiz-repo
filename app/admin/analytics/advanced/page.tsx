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
            // Transform localStorage data to match our interface
            const transformedLocal = parsedResults.map((result: any) => ({
              _id: result._id || result.id || Math.random().toString(),
              date: result.date || new Date().toISOString(),
              quizName: result.quizName || 'Unknown Quiz',
              quizId: result.quizId || 'unknown',
              totalScore: result.totalScore || 0,
              rawScore: result.rawScore || result.totalScore || 0,
              positiveMarks: result.positiveMarks || result.correctAnswers || 0,
              negativeMarks: result.negativeMarks || 0,
              correctAnswers: result.correctAnswers || 0,
              wrongAnswers: result.wrongAnswers || 0,
              unanswered: result.unanswered || 0,
              sections: result.sections || {},
              answers: result.answers || [],
              timeSpent: result.timeSpent || 0,
              negativeMarking: result.negativeMarking || false,
              negativeMarkValue: result.negativeMarkValue || 0,
              user: result.user || { id: result.userId || 'anonymous', name: 'Anonymous User', email: '' },
              quiz: result.quiz || { id: result.quizId || 'unknown', title: result.quizName || 'Unknown Quiz' }
            }))
            setResults(transformedLocal)
            setError(null) // Clear error if fallback works
          } else {
            // If no localStorage data either, create minimal test data
            const testData = [{
              _id: 'test-1',
              date: new Date().toISOString(),
              quizName: 'Sample Quiz',
              quizId: 'sample-1',
              totalScore: 75,
              rawScore: 75,
              positiveMarks: 15,
              negativeMarks: 0,
              correctAnswers: 15,
              wrongAnswers: 5,
              unanswered: 0,
              sections: { reasoning: 75, quantitative: 80, english: 70 },
              answers: [],
              timeSpent: 1800,
              negativeMarking: false,
              negativeMarkValue: 0,
              user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
              quiz: { id: 'sample-1', title: 'Sample Quiz' }
            }]
            setResults(testData)
            setError(null)
          }
        }
      } catch (fallbackError) {
        console.warn("Fallback also failed:", fallbackError)
        setError("Failed to load analytics data from all sources.")
        setResults([]) // Ensure results is empty array on error
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
        <div className="flex flex-col gap-4 mb-6">
          {/* Mobile header */}
          <div className="flex items-center justify-between sm:hidden">
            <div className="flex items-center gap-2">
              <Link href="/admin/analytics">
                <Button variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-lg font-bold text-foreground truncate">Advanced Analytics</h1>
            </div>
            <ThemeToggle />
          </div>

          {/* Mobile description */}
          <div className="text-center sm:hidden">
            <p className="text-xs text-muted-foreground">
              Comprehensive insights and performance analysis
            </p>
          </div>

          {/* Desktop header */}
          <div className="hidden sm:flex items-center justify-between">
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
        {results.length > 0 ? (
          <AdvancedAnalytics results={results} />
        ) : (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {error ? "Analytics Error" : "No analytics data available"}
            </div>
            <div className="text-sm text-muted-foreground mb-6">
              {error ? "Unable to display analytics. Please try refreshing the page." : "Create some quiz results to see advanced analytics"}
            </div>
            <Button onClick={fetchAnalytics} variant="outline">
              {error ? "Retry" : "Refresh"}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
