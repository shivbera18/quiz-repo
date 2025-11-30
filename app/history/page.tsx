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
      <div className="min-h-screen neu-surface flex items-center justify-center pt-16 md:pt-0">
        <div className="neu-card p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quiz history...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen neu-surface flex items-center justify-center p-4 pt-16 md:pt-0">
        <div className="neu-card p-8 text-center max-w-md w-full">
          <p className="text-muted-foreground mb-4">Please log in to view your quiz history</p>
          <Link href="/auth/login">
            <button className="neu-button py-3 px-6 text-sm font-medium text-primary w-full">
              Go to Login
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen neu-surface pt-16 md:pt-0">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          {/* Mobile Header */}
          <div className="md:hidden">
            <div className="neu-card p-4 mb-4">
              <h1 className="text-xl sm:text-2xl font-bold neu-text-gradient break-words">Quiz History</h1>
              <p className="text-muted-foreground text-sm mt-1 break-words">Track your progress and performance over time</p>
            </div>
            <Link href="/dashboard">
              <button className="neu-button py-3 px-4 w-full text-sm font-medium text-primary">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </button>
            </Link>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block">
            <div className="neu-card p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl lg:text-3xl font-bold neu-text-gradient truncate">Quiz History</h1>
                  <p className="text-muted-foreground text-sm lg:text-base break-words">Track your progress and performance over time</p>
                </div>
                <div className="flex-shrink-0">
                  <Link href="/dashboard">
                    <button className="neu-button py-2 px-4 text-sm font-medium text-primary whitespace-nowrap">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Dashboard
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        {attempts.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 w-full overflow-x-auto"
          >
            <motion.div variants={staggerItem} className="bg-card/80 backdrop-blur-sm border border-border/20 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4 md:p-6 min-w-0 hover-lift">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Total Attempts</p>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold neu-text-gradient truncate">{attempts.length}</p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={staggerItem} className="bg-card/80 backdrop-blur-sm border border-border/20 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4 md:p-6 min-w-0 hover-lift">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Average Score</p>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold neu-text-gradient truncate">{getAverageScore()}%</p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={staggerItem} className="bg-card/80 backdrop-blur-sm border border-border/20 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4 md:p-6 min-w-0 hover-lift">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <Target className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Best Score</p>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold neu-text-gradient truncate">{getBestScore()}%</p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={staggerItem} className="bg-card/80 backdrop-blur-sm border border-border/20 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4 md:p-6 min-w-0 hover-lift">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Avg Time</p>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold neu-text-gradient truncate">{getTotalTimeSpent()}m</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Filters and Search */}
        <div className="neu-card p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Filter & Search</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search Quiz</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by quiz name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="neu-input pl-10"
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
        </div>

        {/* Attempts List */}
        <div className="neu-card p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">
              Quiz Attempts ({filteredAttempts.length} {filteredAttempts.length === 1 ? 'result' : 'results'})
            </h3>
            <p className="text-muted-foreground text-sm">
              {searchTerm || scoreFilter !== "all" 
                ? `Filtered from ${attempts.length} total attempts`
                : "All your quiz attempts"
              }
            </p>
          </div>
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-4"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-12 h-12 aspect-square rounded-full flex items-center justify-center font-bold text-white text-lg sm:text-xl flex-shrink-0 shadow-md ${scoreColor}`}>
                        {attempt.totalScore}%
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold truncate max-w-[180px] sm:max-w-xs">{attempt.quizName || 'Unknown Quiz'}</h4>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground whitespace-nowrap">
                          <span>{new Date(attempt.date).toLocaleDateString()}</span>
                          <span>✓ {attempt.correctAnswers} correct</span>
                          <span>✗ {attempt.wrongAnswers} wrong</span>
                          {attempt.unanswered > 0 && <span>⚪ {attempt.unanswered} unanswered</span>}
                          {attempt.timeSpent && (
                            <span>⏱ {Math.round(attempt.timeSpent / 60)}m</span>
                          )}
                        </div>
                        {/* Section scores - always visible, wrap on mobile */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {attempt.sections.reasoning > 0 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                              Reasoning: {attempt.sections.reasoning}%
                            </Badge>
                          )}
                          {attempt.sections.quantitative > 0 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                              Quant: {attempt.sections.quantitative}%
                            </Badge>
                          )}
                          {attempt.sections.english > 0 && (
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                              English: {attempt.sections.english}%
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions: badges, trend, button - stack/wrap on mobile */}
                    <div className="flex flex-wrap sm:flex-nowrap flex-row sm:flex-col gap-2 items-start sm:items-end mt-2 sm:mt-0 min-w-[120px]">
                      <Badge variant={
                        attempt.totalScore >= 80 ? 'default' :
                        attempt.totalScore >= 60 ? 'secondary' : 'destructive'
                      } className="text-xs px-2 py-1 whitespace-nowrap">
                        {attempt.totalScore >= 80 ? 'Excellent' :
                         attempt.totalScore >= 60 ? 'Good' : 'Needs Work'}
                      </Badge>
                      {trend !== null && (
                        <Badge variant={trend >= 0 ? "default" : "destructive"} className="text-xs px-2 py-1 whitespace-nowrap">
                          {trend >= 0 ? "↗" : "↘"} {Math.abs(trend)}%
                        </Badge>
                      )}
                      {attempt.quizId && (
                        <Link href={`/results/${attempt._id}`}>
                          <button className="neu-button py-2 px-4 text-sm font-medium text-primary w-full sm:w-auto">
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </button>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
