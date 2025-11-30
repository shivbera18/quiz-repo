"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { AdminBreadcrumb } from "@/components/ui/admin-breadcrumb"
import { AdminSubNav } from "@/components/layout/admin-sub-nav"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import StudentAnalytics from "@/components/student-analytics"

interface QuizResult {
  _id: string
  date: string
  quizName: string
  quizId: string
  totalScore: number
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  sections: {
    reasoning?: number
    quantitative?: number
    english?: number
    [key: string]: number | undefined
  }
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
  timeSpent: number
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
  const [selectedUserId, setSelectedUserId] = useState<string>('all')

  // Extract unique users from results - more robust extraction
  const uniqueUsers = results.reduce((acc, result) => {
    const userId = result.user?.id
    if (!userId) return acc
    
    // Check if user already exists in accumulator
    if (acc.find(u => u.id === userId)) return acc
    
    const userName = result.user?.name || result.user?.email || `User ${userId.slice(0, 8)}`
    const userEmail = result.user?.email || ''
    
    acc.push({ 
      id: userId, 
      name: userName,
      email: userEmail,
      quizCount: results.filter(r => r.user?.id === userId).length
    })
    return acc
  }, [] as { id: string; name: string; email: string; quizCount: number }[])

  // Filter results by selected user
  const filteredResults = selectedUserId === 'all' 
    ? results 
    : results.filter(r => r.user?.id === selectedUserId)

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
          correctAnswers: answers.filter((a: any) => a.isCorrect).length,
          wrongAnswers: answers.filter((a: any) => !a.isCorrect && !a.isUnanswered && a.selectedAnswer !== null && a.selectedAnswer !== undefined).length,
          unanswered: answers.filter((a: any) => a.isUnanswered || a.selectedAnswer === null || a.selectedAnswer === undefined).length,
          sections,
          answers: answers.map((a: any) => ({
            questionId: a.questionId,
            selectedAnswer: a.selectedAnswer,
            isCorrect: a.isCorrect,
            section: a.section,
            question: a.question,
            options: a.options,
            correctAnswer: a.correctAnswer,
            timeSpent: a.timeSpent,
            isUnanswered: a.isUnanswered
          })),
          timeSpent: result.timeSpent || 0,
          user: result.user || {
            id: result.userId,
            name: result.userName || 'Anonymous',
            email: result.userEmail || ''
          },
          quiz: result.quiz
        }
      })
      
      // Log user info for debugging
      const usersFound = transformedResults.filter((r: any) => r.user?.id).length
      console.log(`📊 Advanced Analytics: Transformed ${transformedResults.length} results, ${usersFound} with user data`)
      console.log(`👥 Unique users:`, [...new Set(transformedResults.map((r: any) => r.user?.name || r.user?.email).filter(Boolean))])
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
      <div className="min-h-screen bg-background flex items-center justify-center mobile-header-safe-zone">
        <div className="text-center">Loading advanced analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background mobile-header-safe-zone">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Admin Sub Navigation */}
        <AdminSubNav />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Advanced Analytics</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Comprehensive performance analysis</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            {/* User Filter */}
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full sm:w-[250px]">
                <Users className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users ({uniqueUsers.length})</SelectItem>
                {uniqueUsers.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name} ({u.quizCount} quizzes)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="sm"
              onClick={fetchAnalytics}
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "🔄 Refresh"}
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 border border-red-200 rounded-lg bg-red-50 dark:bg-red-950/30">
            <div className="flex items-center gap-2">
              <div className="text-red-600 dark:text-red-400">{error}</div>
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

        {/* Advanced Analytics Component - Now using StudentAnalytics */}
        {filteredResults.length > 0 ? (
          <StudentAnalytics results={filteredResults} />
        ) : (
          <div className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {error ? "Analytics Error" : selectedUserId !== 'all' ? "No data for selected user" : "No analytics data available"}
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
