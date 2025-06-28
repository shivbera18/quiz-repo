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
      
      console.log('🔄 Advanced Analytics: Fetching fresh data from API...')
      // Add cache busting to ensure fresh data
      const response = await fetch(`/api/admin/analytics?_t=${Date.now()}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`)
      }

      const data = await response.json()
      console.log("✅ Advanced Analytics: Fetched fresh data:", data.results?.length || 0, "results")
      
      // Transform the data to match our QuizResult interface - no localStorage fallback
      const transformedResults = (data.results || []).map((result: any) => {
        // Parse JSON strings safely
        let sections = { reasoning: 0, quantitative: 0, english: 0 }
        let answers: any[] = []
        
        try {
          if (result.sections && typeof result.sections === 'string') {
            const parsedSections = JSON.parse(result.sections)
            sections = { ...sections, ...parsedSections }
          } else if (result.sections && typeof result.sections === 'object') {
            sections = { ...sections, ...result.sections }
          }
        } catch (e) {
          console.warn('Failed to parse sections JSON:', e)
        }
        
        try {
          if (result.answers && typeof result.answers === 'string') {
            answers = JSON.parse(result.answers)
          } else if (result.answers && Array.isArray(result.answers)) {
            answers = result.answers
          }
        } catch (e) {
          console.warn('Failed to parse answers JSON:', e)
        }

        return {
          _id: result.id || result._id || '',
          date: result.createdAt || result.date || new Date().toISOString(),
          quizName: result.quiz?.title || result.quizName || 'Unknown Quiz',
          quizId: result.quizId || result.quiz?.id || '',
          totalScore: result.totalScore || 0,
          rawScore: result.totalScore || 0, // Use totalScore as rawScore
          positiveMarks: sections.reasoning + sections.quantitative + sections.english,
          negativeMarks: Math.max(0, (sections.reasoning + sections.quantitative + sections.english) - (result.totalScore || 0)),
          correctAnswers: answers.filter(a => a.isCorrect).length,
          wrongAnswers: answers.filter(a => !a.isCorrect && a.selectedAnswer !== null && a.selectedAnswer !== undefined).length,
          unanswered: answers.filter(a => a.selectedAnswer === null || a.selectedAnswer === undefined).length,
          sections,
          answers,
          timeSpent: result.timeSpent || 0,
          negativeMarking: true, // Default value
          negativeMarkValue: 0.25, // Default value
          user: result.user,
          quiz: result.quiz
        }
      })
      
      console.log(`📊 Advanced Analytics: Transformed ${transformedResults.length} results`)
      setResults(transformedResults)
      
    } catch (error) {
      console.error("❌ Advanced Analytics: Error fetching data:", error)
      setError(`Failed to load analytics data: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // No localStorage fallback - always use live data only
      setResults([])
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
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={fetchAnalytics}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading ? "Refreshing..." : "🔄 Refresh Data"}
              </Button>
              <ThemeToggle />
            </div>
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
