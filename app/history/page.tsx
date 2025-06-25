"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, TrendingUp, Eye, Search, Filter, ArrowLeft, Clock, Target, BookOpen } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface HistoryAttempt {
  _id: string
  date: string
  quizName: string
  quizId: string
  totalScore: number
  rawScore?: number
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  timeSpent: number
  sections: {
    reasoning: number
    quantitative: number
    english: number
  }
}

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth()
  const [attempts, setAttempts] = useState<HistoryAttempt[]>([])
  const [filteredAttempts, setFilteredAttempts] = useState<HistoryAttempt[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [scoreFilter, setScoreFilter] = useState("all")
  const [sortBy, setSortBy] = useState("date")

  useEffect(() => {
    if (!authLoading && user) {
      // Fetch attempts from API
      const fetchAttempts = async () => {
        try {
          const response = await fetch("/api/results", {
            headers: {
              Authorization: `Bearer ${user.token || "student-token-placeholder"}`,
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          })
          
          if (response.ok) {
            const data = await response.json()
            const attempts = data.results || []
            setAttempts(attempts)
            setFilteredAttempts(attempts)
          } else {
            // Fallback to localStorage
            const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
            setAttempts(results)
            setFilteredAttempts(results)
          }
        } catch (error) {
          console.error("Failed to fetch attempts:", error)
          // Fallback to localStorage
          const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
          setAttempts(results)
          setFilteredAttempts(results)
        } finally {
          setLoading(false)
        }
      }

      fetchAttempts()
    }
  }, [authLoading, user])

  // Filter and sort attempts
  useEffect(() => {
    let filtered = [...attempts]

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(attempt => 
        attempt.quizName?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by score range
    if (scoreFilter !== "all") {
      switch (scoreFilter) {
        case "excellent":
          filtered = filtered.filter(attempt => attempt.totalScore >= 80)
          break
        case "good":
          filtered = filtered.filter(attempt => attempt.totalScore >= 60 && attempt.totalScore < 80)
          break
        case "needsImprovement":
          filtered = filtered.filter(attempt => attempt.totalScore < 60)
          break
      }
    }

    // Sort attempts
    switch (sortBy) {
      case "date":
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        break
      case "score":
        filtered.sort((a, b) => b.totalScore - a.totalScore)
        break
      case "quiz":
        filtered.sort((a, b) => (a.quizName || "").localeCompare(b.quizName || ""))
        break
    }

    setFilteredAttempts(filtered)
  }, [attempts, searchTerm, scoreFilter, sortBy])

  const getScoreTrend = (index: number) => {
    if (index === filteredAttempts.length - 1) return null
    const current = filteredAttempts[index].totalScore
    const previous = filteredAttempts[index + 1].totalScore
    return current - previous
  }

  const getAverageScore = () => {
    if (attempts.length === 0) return 0
    const total = attempts.reduce((sum, attempt) => sum + attempt.totalScore, 0)
    return Math.round(total / attempts.length)
  }

  const getBestScore = () => {
    if (attempts.length === 0) return 0
    return Math.max(...attempts.map(a => a.totalScore))
  }

  const getTotalTimeSpent = () => {
    if (attempts.length === 0) return 0
    return Math.round(attempts.reduce((sum, attempt) => sum + (attempt.timeSpent || 0), 0) / 60) // in minutes
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading quiz history...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please log in to view your quiz history</p>
          <Link href="/auth/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Quiz History</h1>
            <p className="text-muted-foreground">Track your progress and performance over time</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-blue-50 border-blue-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-blue-700">
                <BookOpen className="h-5 w-5" />
                Total Attempts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-800">{attempts.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-green-700">
                <TrendingUp className="h-5 w-5" />
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-800">{getAverageScore()}%</div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-purple-700">
                <Target className="h-5 w-5" />
                Best Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-800">{getBestScore()}%</div>
            </CardContent>
          </Card>

          <Card className="bg-orange-50 border-orange-200">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <Clock className="h-5 w-5" />
                Total Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-800">{getTotalTimeSpent()}m</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search Quiz</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by quiz name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Filter by Score</label>
                <Select value={scoreFilter} onValueChange={setScoreFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All scores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Scores</SelectItem>
                    <SelectItem value="excellent">Excellent (80%+)</SelectItem>
                    <SelectItem value="good">Good (60-79%)</SelectItem>
                    <SelectItem value="needsImprovement">Needs Improvement (&lt;60%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort by</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date (Latest First)</SelectItem>
                    <SelectItem value="score">Score (Highest First)</SelectItem>
                    <SelectItem value="quiz">Quiz Name (A-Z)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attempts List */}
        <Card>
          <CardHeader>
            <CardTitle>
              Quiz Attempts ({filteredAttempts.length} {filteredAttempts.length === 1 ? 'result' : 'results'})
            </CardTitle>
            <CardDescription>
              {searchTerm || scoreFilter !== "all" 
                ? `Filtered from ${attempts.length} total attempts`
                : "All your quiz attempts"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAttempts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  {searchTerm || scoreFilter !== "all" 
                    ? "No quiz attempts match your filters"
                    : "No quiz attempts yet"
                  }
                </p>
                {!searchTerm && scoreFilter === "all" && (
                  <Link href="/dashboard">
                    <Button>Take Your First Quiz</Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredAttempts.map((attempt, index) => {
                  const trend = getScoreTrend(index)
                  const scoreColor = attempt.totalScore >= 80 ? "bg-green-500" :
                                   attempt.totalScore >= 60 ? "bg-yellow-500" : "bg-red-500"

                  return (
                    <div
                      key={attempt._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${scoreColor}`}>
                          {attempt.totalScore}%
                        </div>
                        
                        <div>
                          <h4 className="font-semibold">{attempt.quizName || 'Unknown Quiz'}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{new Date(attempt.date).toLocaleDateString()}</span>
                            <span>✓ {attempt.correctAnswers} correct</span>
                            <span>✗ {attempt.wrongAnswers} wrong</span>
                            {attempt.unanswered > 0 && <span>⚪ {attempt.unanswered} unanswered</span>}
                            {attempt.timeSpent && (
                              <span>⏱ {Math.round(attempt.timeSpent / 60)}m</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        {/* Section scores */}
                        <div className="hidden md:flex gap-2">
                          {attempt.sections.reasoning > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Reasoning: {attempt.sections.reasoning}%
                            </Badge>
                          )}
                          {attempt.sections.quantitative > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              Quant: {attempt.sections.quantitative}%
                            </Badge>
                          )}
                          {attempt.sections.english > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              English: {attempt.sections.english}%
                            </Badge>
                          )}
                        </div>

                        {/* Performance badge */}
                        <Badge variant={
                          attempt.totalScore >= 80 ? 'default' :
                          attempt.totalScore >= 60 ? 'secondary' : 'destructive'
                        }>
                          {attempt.totalScore >= 80 ? 'Excellent' :
                           attempt.totalScore >= 60 ? 'Good' : 'Needs Work'}
                        </Badge>

                        {/* Trend indicator */}
                        {trend !== null && (
                          <Badge variant={trend >= 0 ? "default" : "destructive"} className="text-xs">
                            {trend >= 0 ? "↗" : "↘"} {Math.abs(trend)}%
                          </Badge>
                        )}

                        {/* View details button */}
                        {attempt.quizId && (
                          <Link href={`/results/${attempt._id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
