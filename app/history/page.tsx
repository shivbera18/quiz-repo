"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, TrendingUp, Eye, Search, Filter, ArrowLeft, Clock, Target, BookOpen } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { staggerContainer, staggerItem } from "@/components/page-transition"

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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card variant="neobrutalist" className="p-8 text-center max-w-md w-full">
          <p className="text-muted-foreground mb-4 font-medium">Please log in to view your quiz history</p>
          <Link href="/auth/login">
            <Button variant="neobrutalistInverted" className="w-full font-bold">
              Go to Login
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-lg h-11 w-11 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#fff] bg-white dark:bg-zinc-900 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Quiz History</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">Track your progress and performance over time</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      {attempts.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <motion.div variants={staggerItem}>
            <Card variant="neobrutalist">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-300 rounded-lg border-2 border-black">
                    <BookOpen className="h-5 w-5 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-muted-foreground">Total Attempts</p>
                    <p className="text-2xl font-black">{attempts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card variant="neobrutalist">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-300 rounded-lg border-2 border-black">
                    <TrendingUp className="h-5 w-5 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-black">{getAverageScore()}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card variant="neobrutalist">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-300 rounded-lg border-2 border-black">
                    <Target className="h-5 w-5 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-muted-foreground">Best Score</p>
                    <p className="text-2xl font-black">{getBestScore()}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={staggerItem}>
            <Card variant="neobrutalist">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-300 rounded-lg border-2 border-black">
                    <Clock className="h-5 w-5 text-black" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-muted-foreground">Avg Time</p>
                    <p className="text-2xl font-black">{getTotalTimeSpent()}m</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}

      {/* Filters and Search */}
      <Card variant="neobrutalist">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 font-black">
            <Filter className="h-5 w-5" />
            Filter & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-bold">Search Quiz</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by quiz name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-2 border-black dark:border-white/30 rounded-lg font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold">Filter by Score</label>
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
              <label className="text-sm font-bold">Sort by</label>
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
      <Card variant="neobrutalist">
        <CardHeader>
          <CardTitle className="font-black">
            Quiz Attempts ({filteredAttempts.length} {filteredAttempts.length === 1 ? 'result' : 'results'})
          </CardTitle>
          <CardDescription className="font-medium">
            {searchTerm || scoreFilter !== "all" 
              ? `Filtered from ${attempts.length} total attempts`
              : "All your quiz attempts"
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAttempts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4 font-medium">
                {searchTerm || scoreFilter !== "all" 
                  ? "No quiz attempts match your filters"
                  : "No quiz attempts yet"
                }
              </p>
              {!searchTerm && scoreFilter === "all" && (
                <Link href="/dashboard">
                  <Button variant="neobrutalistInverted" className="font-bold">Take Your First Quiz</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAttempts.map((attempt, index) => {
                const trend = getScoreTrend(index)
                const scoreColor = attempt.totalScore >= 80 ? "bg-green-400" :
                                 attempt.totalScore >= 60 ? "bg-yellow-400" : "bg-red-400"

                return (
                  <div
                    key={attempt._id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-4 border-black dark:border-white/30 rounded-xl hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#fff] transition-all gap-4 bg-white dark:bg-zinc-900"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-14 h-14 aspect-square rounded-xl flex items-center justify-center font-black text-black text-lg flex-shrink-0 shadow-[2px_2px_0px_0px_#000] border-2 border-black ${scoreColor}`}>
                        {Number(attempt.totalScore).toFixed(0)}%
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold truncate max-w-[180px] sm:max-w-xs">{attempt.quizName || 'Unknown Quiz'}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground font-medium whitespace-nowrap mt-1">
                          <span>{new Date(attempt.date).toLocaleDateString()}</span>
                          <span className="text-green-600 dark:text-green-400">✓ {attempt.correctAnswers}</span>
                          <span className="text-red-600 dark:text-red-400">✗ {attempt.wrongAnswers}</span>
                          {attempt.unanswered > 0 && <span className="text-gray-500">⚪ {attempt.unanswered}</span>}
                          {attempt.timeSpent && (
                            <span>⏱ {Math.round(attempt.timeSpent / 60)}m</span>
                          )}
                        </div>
                        {/* Section scores */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {attempt.sections.reasoning > 0 && (
                            <Badge className="text-xs px-2 py-0.5 font-bold bg-purple-200 text-black border-2 border-black">
                              Reasoning: {attempt.sections.reasoning}%
                            </Badge>
                          )}
                          {attempt.sections.quantitative > 0 && (
                            <Badge className="text-xs px-2 py-0.5 font-bold bg-blue-200 text-black border-2 border-black">
                              Quant: {attempt.sections.quantitative}%
                            </Badge>
                          )}
                          {attempt.sections.english > 0 && (
                            <Badge className="text-xs px-2 py-0.5 font-bold bg-green-200 text-black border-2 border-black">
                              English: {attempt.sections.english}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap sm:flex-nowrap flex-row sm:flex-col gap-2 items-start sm:items-end mt-2 sm:mt-0 min-w-[120px]">
                      <Badge className={`text-xs px-2 py-1 font-bold border-2 border-black ${
                        attempt.totalScore >= 80 ? 'bg-green-300 text-black' :
                        attempt.totalScore >= 60 ? 'bg-yellow-300 text-black' : 'bg-red-300 text-black'
                      }`}>
                        {attempt.totalScore >= 80 ? 'Excellent' :
                         attempt.totalScore >= 60 ? 'Good' : 'Needs Work'}
                      </Badge>
                      {trend !== null && (
                        <Badge className={`text-xs px-2 py-1 font-bold border-2 border-black ${
                          trend >= 0 ? 'bg-green-200 text-black' : 'bg-red-200 text-black'
                        }`}>
                          {trend >= 0 ? "↗" : "↘"} {Math.abs(trend)}%
                        </Badge>
                      )}
                      {attempt.quizId && (
                        <Link href={`/results/${attempt._id}`}>
                          <Button variant="neobrutalist" size="sm" className="font-bold">
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
  )
}
