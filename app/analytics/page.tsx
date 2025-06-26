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
  const refreshData = async (force = false) => {
    setRefreshing(true)
    try {
      if (user) {
        const token = localStorage.getItem('authToken')
        console.log('Refreshing analytics data...', { hasUser: !!user, hasToken: !!token, force })
        
        if (token) {
          // Add cache-busting parameter for force refresh
          const url = force ? `/api/results?_t=${Date.now()}` : '/api/results'
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Cache-Control': force ? 'no-cache' : 'default'
            }
          })
          
          console.log('API response status:', response.status)
          
          if (response.ok) {
            const apiData = await response.json()
            console.log('API data received:', { resultsCount: apiData.results?.length })
            
            if (apiData.results && Array.isArray(apiData.results)) {
              setResults(apiData.results)
              // Update localStorage with fresh data
              localStorage.setItem("quizResults", JSON.stringify(apiData.results))
              console.log('Analytics data updated successfully')
            }
          } else {
            console.error('API response not ok:', response.status, response.statusText)
            // If API fails, try to refresh from localStorage as last resort
            const storedResults = localStorage.getItem("quizResults")
            if (storedResults) {
              const parsedResults = JSON.parse(storedResults)
              const normalizedResults = parsedResults.map((result: any) => ({
                ...result,
                answers: result.answers || []
              }))
              setResults(normalizedResults)
              console.log('Fallback to localStorage during refresh')
            }
          }
        } else {
          console.warn('No auth token found')
        }
      } else {
        console.warn('No user authenticated')
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
        
        console.log('Loading analytics results...', { hasUser: !!user })
        
        // First try to fetch from API if user is authenticated
        if (user) {
          try {
            const token = localStorage.getItem('authToken')
            console.log('Attempting API fetch...', { hasToken: !!token })
            
            if (token) {
              const response = await fetch('/api/results', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              })
              
              console.log('Initial API response:', response.status)
              
              if (response.ok) {
                const apiData = await response.json()
                console.log('Initial API data:', { resultsCount: apiData.results?.length })
                
                if (apiData.results && Array.isArray(apiData.results)) {
                  setResults(apiData.results)
                  // Also update localStorage with fresh data
                  localStorage.setItem("quizResults", JSON.stringify(apiData.results))
                  console.log('Initial load from API successful')
                  setLoading(false)
                  return
                }
              } else {
                console.warn('API response not ok, falling back to localStorage')
              }
            } else {
              console.warn('No auth token, falling back to localStorage')
            }
          } catch (apiError) {
            console.warn("Failed to fetch results from API, falling back to localStorage:", apiError)
          }
        }
        
        // Fallback to localStorage if API fails or user not authenticated
        console.log('Loading from localStorage...')
        const storedResults = localStorage.getItem("quizResults")
        if (storedResults) {
          const parsedResults = JSON.parse(storedResults)
          // Ensure each result has the answers field
          const normalizedResults = parsedResults.map((result: any) => ({
            ...result,
            answers: result.answers || []
          }))
          setResults(normalizedResults)
          console.log('Loaded from localStorage:', { resultsCount: normalizedResults.length })
        } else {
          console.log('No data in localStorage')
        }
      } catch (error) {
        console.error("Error loading quiz results:", error)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [user])

  // Auto-refresh when page becomes visible and periodically
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('Page became visible, refreshing data...')
        refreshData()
      }
    }

    // Set up periodic refresh every 30 seconds when page is visible
    const intervalId = setInterval(() => {
      if (!document.hidden && user) {
        console.log('Periodic refresh...')
        refreshData()
      }
    }, 30000) // 30 seconds

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(intervalId)
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
              onClick={() => refreshData(true)}
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
          <Button onClick={() => refreshData(true)} disabled={refreshing} variant="outline">
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>

        {/* Advanced Analytics Component */}
        <AdvancedAnalytics results={results || []} />

        {/* Debug Information (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <p>Results count: {results.length}</p>
            <p>User authenticated: {user ? 'Yes' : 'No'}</p>
            <p>Auth token: {localStorage.getItem('authToken') ? 'Present' : 'Missing'}</p>
            <p>Last refresh: {refreshing ? 'In progress...' : 'Ready'}</p>
            {results.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer">View raw data</summary>
                <pre className="text-xs mt-2 overflow-auto max-h-40">
                  {JSON.stringify(results.slice(0, 2), null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
