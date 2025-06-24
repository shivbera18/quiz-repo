"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, TrendingUp, Users, BookOpen, Clock, Target, Download, Filter, BarChart3, Menu } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { useAuth } from "@/hooks/use-auth"
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer"

interface QuizResult {
  _id: string
  date: string
  quizName: string
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
}

interface Quiz {
  id: string
  title: string
  questions: any[]
  isActive: boolean
  createdAt: string
}

export default function AdminAnalyticsPage() {
  const { user, loading } = useAuth(true)
  const [results, setResults] = useState<QuizResult[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [filteredResults, setFilteredResults] = useState<QuizResult[]>([])
  const [dateRange, setDateRange] = useState("all")
  const [selectedQuiz, setSelectedQuiz] = useState("all")
  const [minScore, setMinScore] = useState("")
  const [maxScore, setMaxScore] = useState("")

  useEffect(() => {
    if (!loading && user) {
      // Fetch analytics data from backend API
      fetch("/api/admin/analytics")
        .then((res) => res.json())
        .then((data) => {
          setResults(data.results || [])
          setQuizzes(data.quizzes || [])
          setFilteredResults(data.results || [])
        })
        .catch(() => {
          setResults([])
          setQuizzes([])
          setFilteredResults([])
        })
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

    // Score filter
    if (minScore) {
      filtered = filtered.filter((result) => result.totalScore >= Number.parseInt(minScore))
    }
    if (maxScore) {
      filtered = filtered.filter((result) => result.totalScore <= Number.parseInt(maxScore))
    }

    setFilteredResults(filtered)
  }, [results, dateRange, selectedQuiz, minScore, maxScore])

  const getOverallStats = () => {
    if (filteredResults.length === 0)
      return {
        totalAttempts: 0,
        averageScore: 0,
        passRate: 0,
        averageTime: 0,
        topPerformers: 0,
        improvementRate: 0,
      }

    const totalScore = filteredResults.reduce((sum, result) => sum + result.totalScore, 0)
    const averageScore = Math.round(totalScore / filteredResults.length)
    const passRate = Math.round(
      (filteredResults.filter((r) => r.totalScore >= 60).length / filteredResults.length) * 100,
    )
    const totalTime = filteredResults.reduce((sum, result) => sum + (result.timeSpent || 0), 0)
    const averageTime = Math.round(totalTime / filteredResults.length / 60) // Convert to minutes
    const topPerformers = filteredResults.filter((r) => r.totalScore >= 80).length

    // Calculate improvement rate (comparing first half vs second half of attempts)
    const sortedByDate = [...filteredResults].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const midPoint = Math.floor(sortedByDate.length / 2)
    const firstHalf = sortedByDate.slice(0, midPoint)
    const secondHalf = sortedByDate.slice(midPoint)

    let improvementRate = 0
    if (firstHalf.length > 0 && secondHalf.length > 0) {
      const firstHalfAvg = firstHalf.reduce((sum, r) => sum + r.totalScore, 0) / firstHalf.length
      const secondHalfAvg = secondHalf.reduce((sum, r) => sum + r.totalScore, 0) / secondHalf.length
      improvementRate = Math.round(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100)
    }

    return {
      totalAttempts: filteredResults.length,
      averageScore,
      passRate,
      averageTime,
      topPerformers,
      improvementRate,
    }
  }

  const getQuizPerformanceData = () => {
    const quizStats = quizzes
      .map((quiz) => {
        const quizResults = filteredResults.filter((r) => r.quizId === quiz.id)
        if (quizResults.length === 0) return null

        const avgScore = Math.round(quizResults.reduce((sum, r) => sum + r.totalScore, 0) / quizResults.length)
        const attempts = quizResults.length
        const passRate = Math.round((quizResults.filter((r) => r.totalScore >= 60).length / attempts) * 100)

        return {
          name: quiz.title.length > 20 ? quiz.title.substring(0, 20) + "..." : quiz.title,
          avgScore,
          attempts,
          passRate,
          questions: quiz.questions.length,
        }
      })
      .filter(Boolean)

    return quizStats
  }

  const getScoreTrendData = () => {
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
      avgScore: Math.round(week.scores.reduce((sum, score) => sum + score, 0) / week.scores.length),
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
        quiz: result.quizName,
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

  const stats = getOverallStats()
  const quizPerformanceData = getQuizPerformanceData()
  const scoreTrendData = getScoreTrendData()
  const sectionPerformanceData = getSectionPerformanceData()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container w-full max-w-full px-2 sm:px-4 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 sm:gap-0">
          {/* Hamburger menu for mobile */}
          <div className="flex items-center sm:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Menu</DrawerTitle>
                </DrawerHeader>
                <div className="flex flex-col gap-4 p-4">
                  <Link href="/admin">
                    <Button variant="ghost" className="w-full">Admin Home</Button>
                  </Link>
                  <Link href="/admin/analytics/advanced">
                    <Button variant="ghost" className="w-full">Advanced Analytics</Button>
                  </Link>
                  <Button onClick={exportAnalytics} variant="ghost" className="w-full">Export Data</Button>
                  <ThemeToggle />
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full mt-2">Close</Button>
                  </DrawerClose>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
          {/* Main header content (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-muted-foreground text-sm sm:text-base">Comprehensive performance insights and statistics</p>
            </div>
          </div>
          <div className="hidden sm:flex gap-2">
            <Link href="/admin/analytics/advanced">
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Advanced Analytics
              </Button>
            </Link>
            <ThemeToggle />
            <Button onClick={exportAnalytics}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
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
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-6 gap-4 md:gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAttempts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.passRate}%</div>
              <p className="text-xs text-muted-foreground">≥60% score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageTime}m</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.topPerformers}</div>
              <p className="text-xs text-muted-foreground">≥80% score</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Improvement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.improvementRate > 0 ? "+" : ""}
                {stats.improvementRate}%
              </div>
              <p className="text-xs text-muted-foreground">vs earlier attempts</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-8">
          {/* Score Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Score Trend Over Time</CardTitle>
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
                    <Line type="monotone" dataKey="avgScore" stroke="hsl(var(--primary))" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quiz Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Quiz Performance Comparison</CardTitle>
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
                    <Bar dataKey="avgScore" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Section Performance */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Section Performance Analysis</CardTitle>
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
                  <Bar dataKey="average" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Quiz Performance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Detailed Quiz Performance</CardTitle>
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
    </div>
  )
}
