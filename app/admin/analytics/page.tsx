"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AdminBreadcrumb } from "@/components/ui/admin-breadcrumb"

import { TrendingUp, Users, BookOpen, Clock, Target, Download, Filter, BarChart3, Trash2, Eye, User } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts"
import { useAuth } from "@/hooks/use-auth"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface QuizResult {
  _id: string
  id: string
  date: string
  quizId: string
  totalScore: number
  sections: {
    reasoning: number
    quantitative: number
    english: number
  }
  timeSpent?: number
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  userId: string
  userName: string
  userEmail: string
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

interface Quiz {
  id: string
  title: string
  questions: any[]
  isActive: boolean
  createdAt: string
}

// Utility function to get quiz title with fallbacks
const getQuizTitle = (result: QuizResult, quizzes: Quiz[]): string => {
  // First priority: quiz relationship from API
  if (result.quiz?.title) {
    return result.quiz.title
  }
  
  // Second priority: find in quizzes array by quizId
  if (result.quizId) {
    const quiz = quizzes.find(q => q.id === result.quizId)
    if (quiz?.title) {
      return quiz.title
    }
  }
  
  // Debug logging for problematic cases
  if (process.env.NODE_ENV === 'development') {
    console.warn('Unknown Quiz detected:', {
      resultId: result.id,
      quizId: result.quizId,
      hasQuizRelation: !!result.quiz,
      quizTitle: result.quiz?.title,
      availableQuizzes: quizzes.length,
      availableQuizIds: quizzes.map(q => q.id)
    })
  }
  
  // Fallback
  return "Unknown Quiz"
}

export default function AdminAnalyticsPage() {
  const { user, loading } = useAuth(true)
  const [results, setResults] = useState<QuizResult[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [filteredResults, setFilteredResults] = useState<QuizResult[]>([])
  const [dateRange, setDateRange] = useState("all")
  const [selectedQuiz, setSelectedQuiz] = useState("all")
  const [selectedUser, setSelectedUser] = useState("all")
  const [minScore, setMinScore] = useState("")
  const [maxScore, setMaxScore] = useState("")
  const [users, setUsers] = useState<{id: string, name: string, email: string}[]>([])
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [selectedUserForDetails, setSelectedUserForDetails] = useState<string | null>(null)
  const [userPerformanceData, setUserPerformanceData] = useState<any>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      // Always fetch analytics data from backend API with cache busting (no localStorage fallback)
      const fetchAnalytics = async () => {
        try {
          console.log('🔄 Admin Analytics: Fetching fresh data...')
          const response = await fetch(`/api/admin/analytics?_t=${Date.now()}`)
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          const data = await response.json()
          console.log('✅ Admin Analytics: Fresh data received:', {
            resultsCount: data.results?.length,
            quizzesCount: data.quizzes?.length,
            success: data.success
          })
          
          const apiResults = data.results || []
          const apiQuizzes = data.quizzes || []
          setResults(apiResults)
          setFilteredResults(apiResults)
          
          // Extract unique users from results
          const userMap = new Map<string, {id: string; name: string; email: string}>()
          apiResults.forEach((result: QuizResult) => {
            const userId = result.userId || result.user?.id
            const userName = result.userName || result.user?.name
            const userEmail = result.userEmail || result.user?.email
            if (userId && userName && userEmail) {
              userMap.set(userId, {
                id: userId,
                name: userName,
                email: userEmail
              })
            }
          })
          setUsers(Array.from(userMap.values()))
          setQuizzes(apiQuizzes)
          
        } catch (error) {
          console.error("❌ Error fetching admin analytics:", error)
          // For admin analytics, we don't use localStorage fallback - always show current DB state
          setResults([])
          setFilteredResults([])
          setUsers([])
          setQuizzes([])
        }
      }
      
      fetchAnalytics()
    }
  }, [loading, user])

  useEffect(() => {
    // Apply filters
    let filtered = [...results]

    // Date filter
    if (dateRange !== "all") {
      const now = new Date()
      const cutoffDate = new Date()

      switch (dateRange) {
        case "7days":
          cutoffDate.setDate(now.getDate() - 7)
          break
        case "30days":
          cutoffDate.setDate(now.getDate() - 30)
          break
        case "90days":
          cutoffDate.setDate(now.getDate() - 90)
          break
      }

      filtered = filtered.filter((result) => new Date(result.date) >= cutoffDate)
    }

    // Quiz filter
    if (selectedQuiz !== "all") {
      filtered = filtered.filter((result) => result.quizId === selectedQuiz)
    }

    // User filter
    if (selectedUser !== "all") {
      filtered = filtered.filter((result) => 
        (result.userId || result.user?.id) === selectedUser
      )
    }

    // Score filter
    if (minScore) {
      filtered = filtered.filter((result) => result.totalScore >= Number.parseInt(minScore))
    }
    if (maxScore) {
      filtered = filtered.filter((result) => result.totalScore <= Number.parseInt(maxScore))
    }

    setFilteredResults(filtered)
  }, [results, dateRange, selectedQuiz, selectedUser, minScore, maxScore])

  const getOverallStats = () => {
    if (!filteredResults || filteredResults.length === 0)
      return {
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        totalUsers: 0,
        averageTime: 0,
        topPerformers: 0,
        improvementRate: 0,
      }

    const totalAttempts = filteredResults.length
    const totalScore = filteredResults.reduce((sum, result) => sum + (result.totalScore || 0), 0)
    const averageScore = parseFloat((totalScore / totalAttempts).toFixed(2))
    const passRate = Math.round(
      (filteredResults.filter((r) => (r.totalScore || 0) >= 60).length / totalAttempts) * 100
    )
    const totalUsers = new Set(filteredResults.map((result) => result._id)).size
    const totalTime = filteredResults.reduce((sum, result) => sum + (result.timeSpent || 0), 0)
    const averageTime = Math.round(totalTime / totalAttempts / 60) // Convert to minutes
    const topPerformers = filteredResults.filter((r) => (r.totalScore || 0) >= 80).length

    // Calculate improvement rate (comparing first half vs second half of attempts)
    const sortedByDate = [...filteredResults].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const midPoint = Math.floor(sortedByDate.length / 2)
    const firstHalf = sortedByDate.slice(0, midPoint)
    const secondHalf = sortedByDate.slice(midPoint)

    let improvementRate = 0
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstHalfAvg = firstHalf.reduce((sum, r) => sum + (r.totalScore || 0), 0) / firstHalf.length
      const secondHalfAvg = secondHalf.reduce((sum, r) => sum + (r.totalScore || 0), 0) / secondHalf.length
      improvementRate = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
    }

    return {
      totalAttempts,
      averageScore,
      passRate,
      totalUsers,
      averageTime,
      topPerformers,
      improvementRate,
    }
  }

  const getQuizPerformanceData = () => {
    const quizStats = (quizzes || [])
      .map((quiz) => {
        const quizResults = filteredResults.filter((r) => r.quizId === quiz.id)
        if (quizResults.length === 0) return null

        const avgScore = parseFloat((quizResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / quizResults.length).toFixed(2))
        const attempts = quizResults.length
        const passRate = parseFloat(((quizResults.filter((r) => (r.totalScore || 0) >= 60).length / attempts) * 100).toFixed(2))

        return {
          name: quiz.title && quiz.title.length > 20 ? quiz.title.substring(0, 20) + "..." : quiz.title || 'Unknown Quiz',
          fullName: quiz.title || 'Unknown Quiz',
          avgScore,
          attempts,
          passRate,
          questions: quiz.questions ? quiz.questions.length : 0,
        }
      })
      .filter(Boolean)

    return quizStats
  }

  const getScoreTrendData = () => {
    if (!filteredResults || filteredResults.length === 0) return []
    
    const sortedResults = [...filteredResults].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Group by week
    const weeklyData = sortedResults.reduce(
      (acc, result) => {
        const date = new Date(result.date)
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
        const weekKey = weekStart.toISOString().split("T")[0]

        if (!acc[weekKey]) {
          acc[weekKey] = { scores: [], date: weekKey }
        }
        acc[weekKey].scores.push(result.totalScore)

        return acc
      },
      {} as Record<string, { scores: number[]; date: string }>,
    )

    return Object.values(weeklyData).map((week) => ({
      week: new Date(week.date).toLocaleDateString(),
      avgScore: parseFloat((week.scores.reduce((sum, score) => sum + score, 0) / week.scores.length).toFixed(2)),
      attempts: week.scores.length,
    }))
  }

  const getSectionPerformanceData = () => {
    if (filteredResults.length === 0) return []

    const sectionTotals = { reasoning: 0, quantitative: 0, english: 0 }
    const sectionCounts = { reasoning: 0, quantitative: 0, english: 0 }

    filteredResults.forEach((result) => {
      Object.entries(result.sections).forEach(([section, score]) => {
        if (score > 0) {
          sectionTotals[section as keyof typeof sectionTotals] += score
          sectionCounts[section as keyof typeof sectionCounts]++
        }
      })
    })

    return [
      {
        section: "Reasoning",
        average: sectionCounts.reasoning > 0 ? Math.round(sectionTotals.reasoning / sectionCounts.reasoning) : 0,
        attempts: sectionCounts.reasoning,
        color: "#8884d8",
      },
      {
        section: "Quantitative",
        average:
          sectionCounts.quantitative > 0 ? Math.round(sectionTotals.quantitative / sectionCounts.quantitative) : 0,
        attempts: sectionCounts.quantitative,
        color: "#82ca9d",
      },
      {
        section: "English",
        average: sectionCounts.english > 0 ? Math.round(sectionTotals.english / sectionCounts.english) : 0,
        attempts: sectionCounts.english,
        color: "#ffc658",
      },
    ]
  }

  const exportAnalytics = () => {
    const stats = getOverallStats()
    const quizPerformance = getQuizPerformanceData()
    const sectionPerformance = getSectionPerformanceData()

    const exportData = {
      generatedAt: new Date().toISOString(),
      filters: {
        dateRange,
        selectedQuiz: selectedQuiz === "all" ? "All Quizzes" : quizzes.find((q) => q.id === selectedQuiz)?.title,
        scoreRange: minScore || maxScore ? `${minScore || 0}-${maxScore || 100}` : "All Scores",
      },
      overallStats: stats,
      quizPerformance,
      sectionPerformance,
      detailedResults: filteredResults.map((result) => ({
        date: result.date,
        quiz: getQuizTitle(result, quizzes),
        score: result.totalScore,
        timeSpent: result.timeSpent,
        sections: result.sections,
      })),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `admin-analytics-${new Date().toISOString().split("T")[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const deleteResult = async (resultId: string) => {
    if (!confirm("Are you sure you want to delete this quiz result? This action cannot be undone.")) {
      return
    }

    setIsDeleting(true)
    console.log('🗑️ Starting deletion of result:', resultId)

    try {
      const response = await fetch(`/api/admin/results?id=${resultId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("adminToken") || "admin-token"}`
        }
      })

      console.log('🗑️ Delete API response:', response.status)

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Deletion confirmed:', result.deletedId)
        
        // Wait a moment for database to process
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Force refresh from server to get accurate data
        await forceServerRefresh()
        
        console.log('✅ Admin analytics refreshed after deletion')
        alert("Quiz result deleted successfully")
      } else {
        const errorText = await response.text()
        console.error('❌ Deletion failed:', response.status, errorText)
        throw new Error(`Delete failed: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error("❌ Error deleting result:", error)
      alert(`Failed to delete quiz result: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(false)
    }
  }

  const deleteUserResults = async (userId: string, quizId?: string) => {
    const confirmMessage = quizId 
      ? "Are you sure you want to delete all results for this user in this quiz?"
      : "Are you sure you want to delete ALL quiz results for this user?"
    
    if (!confirm(confirmMessage)) {
      return
    }

    setIsDeleting(true)

    try {
      const params = new URLSearchParams({ userId })
      if (quizId) params.append("quizId", quizId)

      const response = await fetch(`/api/admin/results?${params}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("adminToken") || "admin-token"}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ Bulk deletion confirmed:', result)
        
        // Wait a moment for database to process
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Only refresh from server - no local filtering to avoid race conditions
        await forceServerRefresh()
        
        console.log('✅ Admin analytics refreshed after bulk deletion')
        alert("Results deleted successfully")
      } else {
        throw new Error("Failed to delete results")
      }
    } catch (error) {
      console.error("Error deleting results:", error)
      alert("Failed to delete results")
    } finally {
      setIsDeleting(false)
    }
  }

  const viewUserDetails = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/user-performance?userId=${userId}`)
      const data = await response.json()
      
      if (response.ok) {
        setUserPerformanceData(data)
        setSelectedUserForDetails(userId)
        setShowUserDetails(true)
      } else {
        throw new Error(data.error || "Failed to fetch user details")
      }
    } catch (error) {
      console.error("Error fetching user details:", error)
      alert("Failed to fetch user details")
    }
  }

  // Function to refresh analytics data from server
  const forceServerRefresh = async () => {
    try {
      console.log('🔄 Force refreshing admin analytics...')
      const response = await fetch("/api/admin/analytics?_t=" + Date.now())
      if (response.ok) {
        const data = await response.json()
        const apiResults = data.results || []
        const apiQuizzes = data.quizzes || []
        
        console.log(`📊 Refreshed: ${apiResults.length} results, ${apiQuizzes.length} quizzes`)
        
        setResults(apiResults)
        setFilteredResults(apiResults)
        
        // Also update users list from fresh data
        const userMap = new Map<string, {id: string; name: string; email: string}>()
        apiResults.forEach((result: QuizResult) => {
          const userId = result.userId || result.user?.id
          const userName = result.userName || result.user?.name
          const userEmail = result.userEmail || result.user?.email
          if (userId && userName && userEmail) {
            userMap.set(userId, {
              id: userId,
              name: userName,
              email: userEmail
            })
          }
        })
        setUsers(Array.from(userMap.values()))
        setQuizzes(apiQuizzes)
        
        console.log('✅ Admin analytics refresh completed')
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error("❌ Force server refresh failed:", error)
      throw error // Re-throw to let caller handle it
    }
  }

  const stats = getOverallStats()
  const quizPerformanceData = getQuizPerformanceData()
  const scoreTrendData = getScoreTrendData()
  const sectionPerformanceData = getSectionPerformanceData()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center mobile-header-safe-zone">
        <div className="text-center">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background mobile-header-safe-zone">
      <div className="container w-full max-w-full px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics Dashboard</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Performance insights and statistics</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/analytics/advanced">
              <Button variant="neobrutalist" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Advanced</span>
              </Button>
            </Link>
            <Button variant="neobrutalist" size="sm" onClick={exportAnalytics}>
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card variant="neobrutalist" className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-black">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="90days">Last 90 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quiz</Label>
                <Select value={selectedQuiz} onValueChange={setSelectedQuiz}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Quizzes</SelectItem>
                    {quizzes.map((quiz) => (
                      <SelectItem key={quiz.id} value={quiz.id}>
                        {quiz.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>User</Label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Min Score</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  min="0"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <Label>Max Score</Label>
                <Input
                  type="number"
                  placeholder="100"
                  value={maxScore}
                  onChange={(e) => setMaxScore(e.target.value)}
                  min="0"
                  max="100"
                />
              </div>

              <div className="space-y-2">
                <Label>Results</Label>
                <div className="text-sm text-muted-foreground pt-2">
                  Showing {filteredResults.length} of {results.length} attempts
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-2 md:gap-6 mb-8">
          {/* Total Attempts */}
          <Card variant="neobrutalist">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-2 sm:px-4">
              <CardTitle className="text-xs sm:text-sm font-black">Total Attempts</CardTitle>
              <div className="p-2 bg-blue-400 rounded-lg border-2 border-black">
                <Users className="h-4 w-4 text-black" />
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <div className="text-lg sm:text-2xl font-black">{stats.totalAttempts}</div>
            </CardContent>
          </Card>

          {/* Average Score */}
          <Card variant="neobrutalist">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-2 sm:px-4">
              <CardTitle className="text-xs sm:text-sm font-black">Average Score</CardTitle>
              <div className="p-2 bg-green-400 rounded-lg border-2 border-black">
                <TrendingUp className="h-4 w-4 text-black" />
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <div className="text-lg sm:text-2xl font-black">{stats.averageScore}%</div>
            </CardContent>
          </Card>

          {/* Pass Rate */}
          <Card variant="neobrutalist">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-2 sm:px-4">
              <CardTitle className="text-xs sm:text-sm font-black">Pass Rate</CardTitle>
              <div className="p-2 bg-yellow-400 rounded-lg border-2 border-black">
                <Target className="h-4 w-4 text-black" />
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <div className="text-lg sm:text-2xl font-black">{stats.passRate}%</div>
              <p className="text-[10px] sm:text-xs font-bold">≥60% score</p>
            </CardContent>
          </Card>

          {/* Avg Time */}
          <Card variant="neobrutalist">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-2 sm:px-4">
              <CardTitle className="text-xs sm:text-sm font-black">Avg Time</CardTitle>
              <div className="p-2 bg-purple-400 rounded-lg border-2 border-black">
                <Clock className="h-4 w-4 text-black" />
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <div className="text-lg sm:text-2xl font-black">{stats.averageTime}m</div>
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card variant="neobrutalist">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-2 sm:px-4">
              <CardTitle className="text-xs sm:text-sm font-black">Top Performers</CardTitle>
              <div className="p-2 bg-orange-400 rounded-lg border-2 border-black">
                <BookOpen className="h-4 w-4 text-black" />
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <div className="text-lg sm:text-2xl font-black">{stats.topPerformers}</div>
              <p className="text-[10px] sm:text-xs font-bold">≥80% score</p>
            </CardContent>
          </Card>

          {/* Improvement */}
          <Card variant="neobrutalist">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-2 sm:px-4">
              <CardTitle className="text-xs sm:text-sm font-black">Improvement</CardTitle>
              <div className="p-2 bg-pink-400 rounded-lg border-2 border-black">
                <TrendingUp className="h-4 w-4 text-black" />
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-4">
              <div className="text-lg sm:text-2xl font-black">
                {stats.improvementRate > 0 ? "+" : ""}
                {stats.improvementRate}%
              </div>
              <p className="text-[10px] sm:text-xs font-bold">vs earlier attempts</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
          {/* Score Trend */}
          <Card variant="neobrutalist">
            <CardHeader>
              <CardTitle className="font-black">Score Trend Over Time</CardTitle>
              <CardDescription>Weekly average scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={scoreTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avgScore" stroke="#8B5CF6" strokeWidth={2} name="Average Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quiz Performance */}
          <Card variant="neobrutalist">
            <CardHeader>
              <CardTitle className="font-black">Quiz Performance Comparison</CardTitle>
              <CardDescription>Average scores by quiz</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] sm:h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={quizPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="avgScore" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Performance */}
        <Card variant="neobrutalist" className="mb-8">
          <CardHeader>
            <CardTitle className="font-black">Section Performance Analysis</CardTitle>
            <CardDescription>Average performance across different sections</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] sm:h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sectionPerformanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="section" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="average" radius={[4, 4, 0, 0]}>
                    {sectionPerformanceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Individual Results Table with User Data */}
        <Card variant="neobrutalist" className="mb-8">
          <CardHeader>
            <CardTitle className="font-black">Individual Quiz Results</CardTitle>
            <CardDescription>Detailed results with user information and management options</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto text-xs sm:text-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">User</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2">Quiz</th>
                    <th className="text-left p-2">Score</th>
                    <th className="text-left p-2">Correct</th>
                    <th className="text-left p-2">Wrong</th>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.slice(0, 50).map((result, index) => (
                    <tr key={result.id || result._id || index} className="border-b hover:bg-muted/50">
                      <td className="p-2">{new Date(result.date).toLocaleDateString()}</td>
                      <td className="p-2 font-medium">{result.userName || result.user?.name || "Unknown"}</td>
                      <td className="p-2 text-muted-foreground">{result.userEmail || result.user?.email || "Unknown"}</td>
                      <td className="p-2">{getQuizTitle(result, quizzes)}</td>
                      <td className="p-2">
                        <Badge variant={result.totalScore >= 70 ? "default" : "destructive"}>
                          {Number(result.totalScore).toFixed(0)}%
                        </Badge>
                      </td>
                      <td className="p-2 text-green-600">{result.correctAnswers}</td>
                      <td className="p-2 text-red-600">{result.wrongAnswers}</td>
                      <td className="p-2">{result.timeSpent ? Math.round(result.timeSpent / 60) + "m" : "N/A"}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => viewUserDetails(result.userId || result.user?.id || "")}
                            className="h-6 w-6 p-0"
                            title="View user details"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteUserResults(
                              result.userId || result.user?.id || "", 
                              result.quizId
                            )}
                            disabled={isDeleting}
                            className="h-6 w-6 p-0 text-orange-600 hover:text-orange-700"
                            title="Delete user's results for this quiz"
                          >
                            <User className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteResult(result.id || result._id || "")}
                            disabled={isDeleting}
                            className="h-6 w-6 p-0"
                            title="Delete this result"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredResults.length > 50 && (
                <div className="mt-4 text-center text-muted-foreground">
                  Showing first 50 results of {filteredResults.length} total
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Management Actions */}
        {selectedUser !== "all" && (
          <Card variant="neobrutalist" className="mb-8">
            <CardHeader>
              <CardTitle className="font-black">User Management</CardTitle>
              <CardDescription>Bulk actions for selected user</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="neobrutalist"
                  onClick={() => {
                    const userId = selectedUser
                    const user = users.find(u => u.id === userId)
                    if (user) {
                      viewUserDetails(userId)
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View User Performance
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteUserResults(selectedUser)}
                  disabled={isDeleting}
                  className="flex items-center gap-2 border-4 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete All User Results
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Quiz Performance Table */}
        <Card variant="neobrutalist">
          <CardHeader>
            <CardTitle className="font-black">Detailed Quiz Performance</CardTitle>
            <CardDescription>Comprehensive statistics for each quiz</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto text-xs sm:text-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Quiz</th>
                    <th className="text-left p-2">Attempts</th>
                    <th className="text-left p-2">Avg Score</th>
                    <th className="text-left p-2">Pass Rate</th>
                    <th className="text-left p-2">Questions</th>
                    <th className="text-left p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {quizPerformanceData.filter(Boolean).map((quiz, index) => (
                    quiz && (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{quiz.name}</td>
                        <td className="p-2">{quiz.attempts}</td>
                        <td className="p-2">
                          <Badge variant={quiz.avgScore >= 70 ? "default" : "destructive"}>{quiz.avgScore}%</Badge>
                        </td>
                        <td className="p-2">{quiz.passRate}%</td>
                        <td className="p-2">{quiz.questions}</td>
                        <td className="p-2">
                          <Badge variant="outline">Active</Badge>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* User Performance Details Dialog */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Performance Details</DialogTitle>
          </DialogHeader>
          
          {userPerformanceData && (
            <div className="space-y-6">
              {/* User Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">User Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{userPerformanceData.user.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{userPerformanceData.user.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Quizzes</p>
                      <p className="font-medium">{userPerformanceData.user.totalQuizzes}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Average Score</p>
                      <Badge variant={userPerformanceData.user.averageScore >= 70 ? "default" : "destructive"}>
                        {userPerformanceData.user.averageScore}%
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quiz Performance Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance by Quiz</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {userPerformanceData.quizPerformance.map((quiz: any) => (
                      <div key={quiz.quizId} className="border rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="font-medium">{quiz.quizTitle}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{quiz.totalAttempts} attempts</Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteUserResults(userPerformanceData.user.id, quiz.quizId)}
                              disabled={isDeleting}
                              className="flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Delete
                            </Button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div>
                            <p className="text-sm text-muted-foreground">Best Score</p>
                            <Badge variant={quiz.bestScore >= 70 ? "default" : "destructive"}>
                              {quiz.bestScore}%
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Average Score</p>
                            <Badge variant={quiz.averageScore >= 70 ? "default" : "destructive"}>
                              {quiz.averageScore}%
                            </Badge>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Average Time</p>
                            <p className="font-medium">{quiz.averageTime}min</p>
                          </div>
                        </div>

                        {/* Individual Attempts */}
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Recent Attempts:</p>
                          <div className="max-h-32 overflow-y-auto">
                            {quiz.attempts.slice(0, 5).map((attempt: any, index: number) => (
                              <div key={attempt.id} className="flex justify-between items-center text-sm py-1 px-2 rounded hover:bg-muted">
                                <span>{new Date(attempt.date).toLocaleDateString()}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant={attempt.totalScore >= 70 ? "default" : "secondary"} className="text-xs">
                                    {Number(attempt.totalScore).toFixed(0)}%
                                  </Badge>
                                  <span className="text-muted-foreground">{attempt.timeSpent ? Math.round(attempt.timeSpent / 60) + "m" : "N/A"}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => deleteResult(attempt.id)}
                                    disabled={isDeleting}
                                    className="h-5 w-5 p-0 text-red-500 hover:text-red-700"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
