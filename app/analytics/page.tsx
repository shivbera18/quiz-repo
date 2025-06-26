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
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [dataSource, setDataSource] = useState<'api' | 'localStorage' | 'unknown'>('unknown')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')

  // Function to refresh analytics data
  const refreshData = async (force = false) => {
    setRefreshing(true)
    try {
      if (user) {
        // Try both token keys for compatibility
        const token = localStorage.getItem('authToken') || localStorage.getItem('token')
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
            console.log('API data received:', { 
              resultsCount: apiData.results?.length, 
              success: apiData.success,
              timestamp: apiData.timestamp
            })
            
            // API now always returns results array, even if empty
            if (apiData.results && Array.isArray(apiData.results)) {
              setResults(apiData.results)
              // Update localStorage with fresh data
              localStorage.setItem("quizResults", JSON.stringify(apiData.results))
              setLastUpdated(new Date())
              setDataSource('api')
              setConnectionStatus('connected')
              console.log('Analytics data updated successfully')
            }
          } else {
            setConnectionStatus('disconnected')
            console.error('API response not ok:', response.status, response.statusText)
            // Log the response body for debugging
            const errorText = await response.text()
            console.error('API error response:', errorText)
            
            // If API fails, try to refresh from localStorage as last resort
            const storedResults = localStorage.getItem("quizResults")
            if (storedResults) {
              const parsedResults = JSON.parse(storedResults)
              const normalizedResults = parsedResults.map((result: any) => ({
                ...result,
                answers: result.answers || []
              }))
              setResults(normalizedResults)
              setDataSource('localStorage')
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
            // Try both token keys for compatibility
            const token = localStorage.getItem('authToken') || localStorage.getItem('token')
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
                console.log('Initial API data:', { 
                  resultsCount: apiData.results?.length,
                  success: apiData.success,
                  timestamp: apiData.timestamp
                })
                
                // API now always returns results array, even if empty
                if (apiData.results && Array.isArray(apiData.results)) {
                  setResults(apiData.results)
                  // Also update localStorage with fresh data
                  localStorage.setItem("quizResults", JSON.stringify(apiData.results))
                  setLastUpdated(new Date())
                  setDataSource('api')
                  setConnectionStatus('connected')
                  console.log('Initial load from API successful')
                  setLoading(false)
                  return
                }
              } else {
                setConnectionStatus('disconnected')
                console.warn('API response not ok, falling back to localStorage')
                // Log the error for debugging
                const errorText = await response.text()
                console.error('API error:', errorText)
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
          setDataSource('localStorage')
          setConnectionStatus('disconnected') // Using cached data means we're not connected to API
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

    // Set up periodic refresh every 15 seconds when page is visible (reduced from 30s for faster updates)
    const intervalId = setInterval(() => {
      if (!document.hidden && user) {
        console.log('Periodic refresh...')
        refreshData()
      }
    }, 15000) // 15 seconds for more responsive updates

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
            <Button
              variant="secondary"
              onClick={async () => {
                setRefreshing(true)
                try {
                  // Smart refresh: try API first, only update cache if API works
                  const token = localStorage.getItem('authToken') || localStorage.getItem('token')
                  if (token && user) {
                    try {
                      const response = await fetch(`/api/results?_t=${Date.now()}`, {
                        headers: {
                          'Authorization': `Bearer ${token}`,
                          'Cache-Control': 'no-cache'
                        }
                      })
                      
                      if (response.ok) {
                        const apiData = await response.json()
                        console.log('Force refresh API data:', {
                          resultsCount: apiData.results?.length,
                          success: apiData.success,
                          timestamp: apiData.timestamp
                        })
                        
                        // API now always returns results array, even if empty
                        if (apiData.results && Array.isArray(apiData.results)) {
                          // Only update if we successfully got fresh data
                          localStorage.setItem("quizResults", JSON.stringify(apiData.results))
                          setResults(apiData.results)
                          setLastUpdated(new Date())
                          setDataSource('api')
                          setConnectionStatus('connected')
                          console.log("Analytics force refreshed with latest data from server")
                          return
                        }
                      } else {
                        setConnectionStatus('disconnected')
                        const errorText = await response.text()
                        console.error('Force refresh API error:', errorText)
                      }
                    } catch (error) {
                      console.error("API refresh failed:", error)
                    }
                  }
                  
                  // If API fails, inform user but don't touch localStorage
                  console.warn("Unable to refresh from server - keeping existing data")
                } finally {
                  setRefreshing(false)
                }
              }}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              {refreshing ? "Force Refreshing..." : "Force Refresh"}
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Data Status Information */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">
                {results.length} quiz result{results.length !== 1 ? 's' : ''} found
              </span>
              {lastUpdated && (
                <span className="text-muted-foreground">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                dataSource === 'api' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : dataSource === 'localStorage'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}>
                {dataSource === 'api' ? '🟢 Live Data' : 
                 dataSource === 'localStorage' ? '🟡 Cached Data' : '🔄 Loading...'}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${
                connectionStatus === 'connected'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : connectionStatus === 'disconnected'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                {connectionStatus === 'connected' ? '📡 Connected' :
                 connectionStatus === 'disconnected' ? '📡 Offline' : '📡 Checking...'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {refreshing ? 'Syncing...' : 'Auto-refresh: 15s'}
            </div>
          </div>
        </div>

        {/* No Results Help Panel */}
        {results.length === 0 && !loading && (
          <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-4">
              <div className="text-blue-600 dark:text-blue-400 text-2xl">📊</div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  No Analytics Data Found
                </h3>
                <p className="text-blue-800 dark:text-blue-200 mb-4">
                  We couldn't find any quiz results for your account. Here are some possible reasons:
                </p>
                
                <div className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    <span>You haven't completed any quizzes yet</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    <span>You might be logged in with a different account</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    <span>Your quiz results might not have been saved properly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">•</span>
                    <span>There might be a temporary connection issue</span>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/dashboard">
                    <Button variant="outline" size="sm" className="text-blue-700 border-blue-300 hover:bg-blue-100">
                      Take a Quiz
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshData(true)}
                    disabled={refreshing}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    {refreshing ? "Checking..." : "Check Again"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const user = JSON.parse(localStorage.getItem('user') || '{}');
                      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
                      alert(`Account: ${user.name || 'Unknown'} (${user.email || 'No email'})\nToken: ${token ? 'Present' : 'Missing'}\nConnection: ${connectionStatus}\nData Source: ${dataSource}`);
                    }}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    Check Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Analytics Component */}
        <AdvancedAnalytics results={results || []} />

        {/* Debug Information (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <p>Results count: {results.length}</p>
            <p>User authenticated: {user ? 'Yes' : 'No'}</p>
            <p>Auth token: {localStorage.getItem('authToken') ? 'Present (authToken)' : localStorage.getItem('token') ? 'Present (token)' : 'Missing'}</p>
            <p>Token format: {localStorage.getItem('authToken') || localStorage.getItem('token') ? 'Valid' : 'Invalid'}</p>
            <p>Data source: {dataSource}</p>
            <p>Last updated: {lastUpdated ? lastUpdated.toISOString() : 'Never'}</p>
            <p>Refresh status: {refreshing ? 'In progress...' : 'Ready'}</p>
            {results.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer">View raw data</summary>
                <pre className="text-xs mt-2 overflow-auto max-h-40">
                  {JSON.stringify(results.slice(0, 2), null, 2)}
                </pre>
              </details>
            )}
            <div className="mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  console.log('Debug - localStorage contents:')
                  console.log('authToken:', localStorage.getItem('authToken'))
                  console.log('token:', localStorage.getItem('token'))
                  console.log('user:', localStorage.getItem('user'))
                  console.log('quizResults count:', JSON.parse(localStorage.getItem('quizResults') || '[]').length)
                  console.log('Current data source:', dataSource)
                  console.log('Last updated:', lastUpdated)
                }}
              >
                Log Debug Info
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
