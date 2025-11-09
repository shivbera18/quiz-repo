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
  const [dataSource, setDataSource] = useState<'api' | 'disconnected' | 'loading'>('loading')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking')

  // Function to refresh analytics data - always fetch fresh
  const refreshData = async (force = false) => {
    setRefreshing(true)
    try {
      if (user) {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token')
        console.log('Refreshing analytics data...', { hasUser: !!user, hasToken: !!token, force })
        
        if (token) {
          // Always force fresh data with cache busting
          const url = `/api/analytics?_t=${Date.now()}`
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          })
          
          console.log('Analytics API response status:', response.status)
          
          if (response.ok) {
            const apiData = await response.json()
            console.log('Analytics API data received:', { 
              resultsCount: apiData.results?.length, 
              success: apiData.success,
              timestamp: apiData.timestamp,
              hasAnalytics: !!apiData.analytics
            })
            
            if (apiData.results && Array.isArray(apiData.results)) {
              setResults(apiData.results)
              setLastUpdated(new Date())
              setDataSource('api')
              setConnectionStatus('connected')
              console.log('Analytics data updated successfully with fresh data')
            }
          } else {
            setConnectionStatus('disconnected')
            console.error('Analytics API response not ok:', response.status, response.statusText)
            
            // Try fallback results API with fresh data
            const fallbackResponse = await fetch(`/api/results?_t=${Date.now()}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
              }
            })
            
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json()
              if (fallbackData.results && Array.isArray(fallbackData.results)) {
                setResults(fallbackData.results)
                setLastUpdated(new Date())
                setDataSource('api')
                setConnectionStatus('connected')
                console.log('Fallback to results API successful with fresh data')
              }
            } else {
              console.error('Both analytics and results APIs failed')
              setResults([])
              setDataSource('disconnected')
              setConnectionStatus('disconnected')
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
        
        console.log('Loading analytics results (ALWAYS FRESH)...', { hasUser: !!user })
        
        if (user) {
          const token = localStorage.getItem('authToken') || localStorage.getItem('token')
          console.log('Attempting fresh analytics API fetch...', { hasToken: !!token })
          
          if (token) {
            try {
              // Always fetch fresh data with cache busting
              const response = await fetch(`/api/analytics?_t=${Date.now()}`, {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache',
                  'Expires': '0'
                }
              })
              
              console.log('Fresh analytics API response:', response.status)
              
              if (response.ok) {
                const apiData = await response.json()
                console.log('Fresh analytics API data:', { 
                  resultsCount: apiData.results?.length,
                  success: apiData.success,
                  timestamp: apiData.timestamp,
                  hasAnalytics: !!apiData.analytics
                })
                
                if (apiData.results && Array.isArray(apiData.results)) {
                  setResults(apiData.results)
                  setLastUpdated(new Date())
                  setDataSource('api')
                  setConnectionStatus('connected')
                  console.log('Fresh analytics data loaded successfully')
                  setLoading(false)
                  return
                }
              } else {
                console.warn('Analytics API failed, trying results API with fresh data')
                
                const fallbackResponse = await fetch(`/api/results?_t=${Date.now()}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                  }
                })
                
                if (fallbackResponse.ok) {
                  const fallbackData = await fallbackResponse.json()
                  if (fallbackData.results && Array.isArray(fallbackData.results)) {
                    setResults(fallbackData.results)
                    setLastUpdated(new Date())
                    setDataSource('api')
                    setConnectionStatus('connected')
                    console.log('Fresh results API data loaded successfully')
                    setLoading(false)
                    return
                  }
                }
                
                console.error('Both analytics and results APIs failed')
                setConnectionStatus('disconnected')
                setResults([])
              }
            } catch (apiError) {
              console.error("Failed to fetch fresh analytics data:", apiError)
              setDataSource('disconnected')
              setConnectionStatus('disconnected')
              setResults([])
            }
          } else {
            console.warn('No auth token available')
            setResults([])
            setDataSource('disconnected')
            setConnectionStatus('disconnected')
          }
        } else {
          console.log('No user authenticated')
          setResults([])
        }
      } catch (error) {
        console.error("Error loading fresh quiz results:", error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [user])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        console.log('Page became visible, refreshing data with fresh fetch...')
        refreshData(true) // Always force fresh data
      }
    }

    const intervalId = setInterval(() => {
      if (!document.hidden && user) {
        console.log('Periodic refresh with fresh data...')
        refreshData(true) // Always force fresh data
      }
    }, 15000)

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(intervalId)
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen neu-surface flex items-center justify-center">
        <div className="neu-card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen neu-surface">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-full overflow-x-hidden">
        {/* Mobile-Responsive Header */}
        <div className="mb-6">
          {/* Mobile Layout */}
          <div className="flex flex-col space-y-4 sm:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <button className="neu-icon-button p-2">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                </Link>
                <div className="neu-icon-button p-2">
                  <ThemeToggle />
                </div>
              </div>
            </div>
            <div className="neu-card p-4">
              <h1 className="text-xl font-bold neu-text-gradient break-words">Performance Analytics</h1>
              <p className="text-sm text-muted-foreground mt-1 break-words">Detailed insights into your quiz performance</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => refreshData(true)}
                disabled={refreshing}
                className="neu-button py-3 px-4 w-full text-sm font-medium text-primary disabled:opacity-50"
              >
                {refreshing ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:block">
            <div className="neu-card p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center gap-4">
                  <Link href="/dashboard">
                    <button className="neu-icon-button p-3">
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-2xl lg:text-3xl font-bold neu-text-gradient truncate">Performance Analytics</h1>
                    <p className="text-muted-foreground text-sm lg:text-base break-words">Comprehensive insights into your quiz performance and progress</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => refreshData(true)}
                    disabled={refreshing}
                    className="neu-button py-2 px-4 text-sm font-medium text-primary whitespace-nowrap disabled:opacity-50"
                  >
                    {refreshing ? "Refreshing..." : "Refresh"}
                  </button>
                  <div className="neu-icon-button p-2">
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile-Responsive Data Status Information */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
          <div className="sm:hidden">
            <div className="flex flex-col space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {results.length} result{results.length !== 1 ? 's' : ''}
                </span>
                {lastUpdated && (
                  <span className="text-muted-foreground text-xs">
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  dataSource === 'api' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                    : dataSource === 'disconnected'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {dataSource === 'api' ? '🟢 Fresh Data' : 
                   dataSource === 'disconnected' ? '� No Connection' : '🔄 Loading'}
                </span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  connectionStatus === 'connected'
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : connectionStatus === 'disconnected'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {connectionStatus === 'connected' ? '🟢 Online' : 
                   connectionStatus === 'disconnected' ? '🔴 Offline' : '🔄 Checking'}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {refreshing ? 'Syncing...' : 'Auto-refresh: 15s'}
              </div>
            </div>
          </div>
          
          <div className="hidden sm:block">
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
                    : dataSource === 'disconnected'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }`}>
                  {dataSource === 'api' ? '🟢 Fresh Data' : 
                   dataSource === 'disconnected' ? '� No Connection' : '🔄 Loading...'}
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
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Analytics Component */}
        <AdvancedAnalytics 
          results={results || []} 
          currentUserId={user?.id}
          isStudentMode={true}
        />

        {/* Debug Information (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <p>Results count: {results.length}</p>
            <p>User authenticated: {user ? 'Yes' : 'No'}</p>
            <p>Data source: {dataSource}</p>
            <p>Last updated: {lastUpdated ? lastUpdated.toISOString() : 'Never'}</p>
            <p>Refresh status: {refreshing ? 'In progress...' : 'Ready'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
