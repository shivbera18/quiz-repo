"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, Legend
} from 'recharts'
import {
  Trophy, TrendingUp, TrendingDown, Target, Clock, BookOpen,
  Activity, CheckCircle2, XCircle, MinusCircle, Zap, Award,
  Calendar, BarChart3, PieChart as PieChartIcon, Flame, Brain,
  ArrowUp, ArrowDown, Minus, Timer, ChevronDown, ChevronRight, ExternalLink
} from "lucide-react"
import { format, subDays, differenceInDays } from "date-fns"

interface QuizAnswer {
  questionId: string
  selectedAnswer: number | null
  isCorrect: boolean
  section?: string
  question?: string
  options?: string[]
  correctAnswer?: number
  timeSpent?: number // Time spent on this question in milliseconds
  isUnanswered?: boolean // Whether question was left unanswered
}

// Helper function to format milliseconds to mm:ss or m:ss format
const formatTime = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Helper function to format time difference
const formatTimeDiff = (diffMs: number): string => {
  const totalSeconds = Math.round(Math.abs(diffMs) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const sign = diffMs >= 0 ? '+' : '-'
  return `${sign}${minutes}:${seconds.toString().padStart(2, '0')}`
}

interface QuizResult {
  _id: string
  id?: string
  date: string
  quizName: string
  quizId: string
  totalScore: number
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  timeSpent: number
  sections: {
    reasoning?: number
    quantitative?: number
    english?: number
    [key: string]: number | undefined
  }
  answers: QuizAnswer[]
  subject?: string
  chapter?: string
}

interface StudentAnalyticsProps {
  results: QuizResult[]
}

const SECTION_COLORS = {
  reasoning: '#8B5CF6',
  quantitative: '#3B82F6', 
  english: '#10B981',
}

const CHART_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899']

export default function StudentAnalytics({ results = [] }: StudentAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('all')
  const [selectedTab, setSelectedTab] = useState("overview")

  // Filter results based on period
  const filteredResults = useMemo(() => {
    if (selectedPeriod === 'all') return results
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90
    const cutoffDate = subDays(new Date(), days)
    return results.filter(r => new Date(r.date) >= cutoffDate)
  }, [results, selectedPeriod])

  // ============ OVERVIEW METRICS ============
  const overviewMetrics = useMemo(() => {
    if (filteredResults.length === 0) return null

    const totalQuizzes = filteredResults.length
    const totalCorrect = filteredResults.reduce((sum, r) => sum + (r.correctAnswers || 0), 0)
    const totalWrong = filteredResults.reduce((sum, r) => sum + (r.wrongAnswers || 0), 0)
    const totalUnanswered = filteredResults.reduce((sum, r) => sum + (r.unanswered || 0), 0)
    const totalQuestions = totalCorrect + totalWrong + totalUnanswered
    const totalTimeSpent = filteredResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0)
    
    const averageScore = Math.round(filteredResults.reduce((sum, r) => sum + (r.totalScore || 0), 0) / totalQuizzes)
    const highestScore = Math.max(...filteredResults.map(r => r.totalScore || 0))
    const lowestScore = Math.min(...filteredResults.map(r => r.totalScore || 0))
    const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0
    const attemptRate = totalQuestions > 0 ? Math.round(((totalCorrect + totalWrong) / totalQuestions) * 100) : 0
    
    // Performance trend (comparing first half vs second half)
    const midPoint = Math.floor(filteredResults.length / 2)
    const sortedByDate = [...filteredResults].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const firstHalf = sortedByDate.slice(0, midPoint)
    const secondHalf = sortedByDate.slice(midPoint)
    
    const firstHalfAvg = firstHalf.length > 0 
      ? firstHalf.reduce((sum, r) => sum + (r.totalScore || 0), 0) / firstHalf.length 
      : 0
    const secondHalfAvg = secondHalf.length > 0 
      ? secondHalf.reduce((sum, r) => sum + (r.totalScore || 0), 0) / secondHalf.length 
      : 0
    const improvementTrend = secondHalfAvg - firstHalfAvg

    // Streak calculation
    const sortedDates = [...new Set(filteredResults.map(r => format(new Date(r.date), 'yyyy-MM-dd')))].sort()
    let currentStreak = 0
    let maxStreak = 0
    let tempStreak = 1
    
    for (let i = 1; i < sortedDates.length; i++) {
      const diff = differenceInDays(new Date(sortedDates[i]), new Date(sortedDates[i-1]))
      if (diff === 1) {
        tempStreak++
      } else {
        maxStreak = Math.max(maxStreak, tempStreak)
        tempStreak = 1
      }
    }
    maxStreak = Math.max(maxStreak, tempStreak)
    
    // Check if last quiz was today or yesterday for current streak
    if (sortedDates.length > 0) {
      const lastDate = new Date(sortedDates[sortedDates.length - 1])
      const daysSinceLastQuiz = differenceInDays(new Date(), lastDate)
      if (daysSinceLastQuiz <= 1) {
        currentStreak = tempStreak
      }
    }

    return {
      totalQuizzes,
      totalQuestions,
      totalCorrect,
      totalWrong,
      totalUnanswered,
      totalTimeSpent,
      averageScore,
      highestScore,
      lowestScore,
      accuracy,
      attemptRate,
      improvementTrend,
      currentStreak,
      maxStreak,
      averageTimePerQuiz: Math.round(totalTimeSpent / totalQuizzes / 60), // in minutes
      averageTimePerQuestion: totalQuestions > 0 ? Math.round(totalTimeSpent / totalQuestions) : 0, // in seconds
    }
  }, [filteredResults])

  // ============ SECTION-WISE ANALYSIS ============
  const sectionAnalysis = useMemo(() => {
    const sections: { [key: string]: { correct: number; wrong: number; unanswered: number; scores: number[] } } = {}
    
    filteredResults.forEach(result => {
      // From answers array
      (result.answers || []).forEach(answer => {
        const section = answer.section || 'unknown'
        if (!sections[section]) {
          sections[section] = { correct: 0, wrong: 0, unanswered: 0, scores: [] }
        }
        if (answer.selectedAnswer === null || answer.selectedAnswer === undefined) {
          sections[section].unanswered++
        } else if (answer.isCorrect) {
          sections[section].correct++
        } else {
          sections[section].wrong++
        }
      })

      // Add section scores from result.sections
      Object.entries(result.sections || {}).forEach(([section, score]) => {
        if (score !== undefined && typeof score === 'number') {
          if (!sections[section]) {
            sections[section] = { correct: 0, wrong: 0, unanswered: 0, scores: [] }
          }
          sections[section].scores.push(score)
        }
      })
    })

    return Object.entries(sections)
      .filter(([key]) => key !== 'unknown')
      .map(([section, data]) => {
        const total = data.correct + data.wrong + data.unanswered
        const accuracy = total > 0 ? Math.round((data.correct / total) * 100) : 0
        const avgScore = data.scores.length > 0 
          ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length) 
          : 0
        
        return {
          section: section.charAt(0).toUpperCase() + section.slice(1),
          sectionKey: section,
          correct: data.correct,
          wrong: data.wrong,
          unanswered: data.unanswered,
          total,
          accuracy,
          avgScore,
          color: SECTION_COLORS[section as keyof typeof SECTION_COLORS] || '#666666'
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [filteredResults])

  // ============ QUIZ-WISE BREAKDOWN ============
  const quizBreakdown = useMemo(() => {
    return [...filteredResults]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .map(result => {
        const total = (result.correctAnswers || 0) + (result.wrongAnswers || 0) + (result.unanswered || 0)
        return {
          id: result._id || result.id,
          name: result.quizName,
          date: result.date,
          score: result.totalScore,
          correct: result.correctAnswers || 0,
          wrong: result.wrongAnswers || 0,
          unanswered: result.unanswered || 0,
          total,
          accuracy: total > 0 ? Math.round(((result.correctAnswers || 0) / total) * 100) : 0,
          timeSpent: result.timeSpent,
          subject: result.subject || 'General',
          chapter: result.chapter || 'Unknown'
        }
      })
  }, [filteredResults])

  // ============ PERFORMANCE TREND DATA ============
  const performanceTrend = useMemo(() => {
    return [...filteredResults]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r, i) => ({
        name: `Q${i + 1}`,
        fullName: r.quizName,
        date: format(new Date(r.date), 'MMM d'),
        score: r.totalScore,
        accuracy: (r.correctAnswers || 0) + (r.wrongAnswers || 0) > 0 
          ? Math.round((r.correctAnswers || 0) / ((r.correctAnswers || 0) + (r.wrongAnswers || 0)) * 100)
          : 0
      }))
  }, [filteredResults])

  // ============ DAILY ACTIVITY DATA ============
  const dailyActivity = useMemo(() => {
    const dailyData: { [key: string]: { quizzes: number; avgScore: number; scores: number[] } } = {}
    
    filteredResults.forEach(result => {
      const day = format(new Date(result.date), 'yyyy-MM-dd')
      if (!dailyData[day]) {
        dailyData[day] = { quizzes: 0, avgScore: 0, scores: [] }
      }
      dailyData[day].quizzes++
      dailyData[day].scores.push(result.totalScore)
    })

    return Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        displayDate: format(new Date(date), 'MMM d'),
        quizzes: data.quizzes,
        avgScore: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14) // Last 14 days
  }, [filteredResults])

  // ============ SCORE DISTRIBUTION ============
  const scoreDistribution = useMemo(() => {
    const ranges = [
      { range: '0-20', min: 0, max: 20, count: 0 },
      { range: '21-40', min: 21, max: 40, count: 0 },
      { range: '41-60', min: 41, max: 60, count: 0 },
      { range: '61-80', min: 61, max: 80, count: 0 },
      { range: '81-100', min: 81, max: 100, count: 0 },
    ]

    filteredResults.forEach(result => {
      const score = result.totalScore
      const range = ranges.find(r => score >= r.min && score <= r.max)
      if (range) range.count++
    })

    return ranges
  }, [filteredResults])

  // ============ ANSWER DISTRIBUTION PIE ============
  const answerDistribution = useMemo(() => {
    if (!overviewMetrics) return []
    return [
      { name: 'Correct', value: overviewMetrics.totalCorrect, color: '#10B981' },
      { name: 'Wrong', value: overviewMetrics.totalWrong, color: '#EF4444' },
      { name: 'Unanswered', value: overviewMetrics.totalUnanswered, color: '#6B7280' },
    ].filter(d => d.value > 0)
  }, [overviewMetrics])

  // ============ RADAR DATA FOR SECTIONS ============
  const radarData = useMemo(() => {
    return sectionAnalysis.map(s => ({
      section: s.section,
      accuracy: s.accuracy,
      avgScore: s.avgScore,
      fullMark: 100
    }))
  }, [sectionAnalysis])

  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Analytics Data</h3>
        <p className="text-muted-foreground">Complete some quizzes to see your detailed performance insights.</p>
      </div>
    )
  }

  if (!overviewMetrics) {
    return (
      <div className="text-center py-12">
        <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Data for Selected Period</h3>
        <p className="text-muted-foreground">Try selecting a different time period.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex flex-wrap gap-2">
        {(['7d', '30d', '90d', 'all'] as const).map(period => (
          <Button
            key={period}
            variant={selectedPeriod === period ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod(period)}
          >
            {period === 'all' ? 'All Time' : period === '7d' ? 'Last 7 Days' : period === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
          </Button>
        ))}
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Total Quizzes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics.totalQuizzes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overviewMetrics.totalQuestions} questions attempted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Target className="h-4 w-4" />
              Average Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics.averageScore}%</div>
            <div className="flex items-center gap-1 mt-1">
              {overviewMetrics.improvementTrend > 0 ? (
                <>
                  <ArrowUp className="h-3 w-3 text-green-500" />
                  <span className="text-xs text-green-500">+{Math.round(overviewMetrics.improvementTrend)}% trend</span>
                </>
              ) : overviewMetrics.improvementTrend < 0 ? (
                <>
                  <ArrowDown className="h-3 w-3 text-red-500" />
                  <span className="text-xs text-red-500">{Math.round(overviewMetrics.improvementTrend)}% trend</span>
                </>
              ) : (
                <>
                  <Minus className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Stable</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics.accuracy}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {overviewMetrics.totalCorrect}/{overviewMetrics.totalCorrect + overviewMetrics.totalWrong} correct
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4" />
              Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overviewMetrics.currentStreak} days</div>
            <p className="text-xs text-muted-foreground mt-1">
              Best: {overviewMetrics.maxStreak} days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-xs text-muted-foreground">Best Score</p>
                <p className="text-lg font-bold">{overviewMetrics.highestScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-xs text-muted-foreground">Lowest Score</p>
                <p className="text-lg font-bold">{overviewMetrics.lowestScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Time/Quiz</p>
                <p className="text-lg font-bold">{overviewMetrics.averageTimePerQuiz}m</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Avg Time/Q</p>
                <p className="text-lg font-bold">{overviewMetrics.averageTimePerQuestion}s</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-muted-foreground">Attempt Rate</p>
                <p className="text-lg font-bold">{overviewMetrics.attemptRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Detailed Analytics */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        {/* Mobile: Dropdown selector */}
        <div className="md:hidden">
          <Select value={selectedTab} onValueChange={setSelectedTab}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select view" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">📊 Overview</SelectItem>
              <SelectItem value="sections">📚 Sections</SelectItem>
              <SelectItem value="quizzes">📝 Quizzes</SelectItem>
              <SelectItem value="time">⏱️ Time Analysis</SelectItem>
              <SelectItem value="trends">📈 Trends</SelectItem>
              <SelectItem value="distribution">🎯 Distribution</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Desktop: Tab list */}
        <TabsList className="hidden md:grid md:grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sections">Sections</TabsTrigger>
          <TabsTrigger value="quizzes">Quizzes</TabsTrigger>
          <TabsTrigger value="time">Time Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="distribution">Distribution</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Score Trend Line Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Score Progression
                </CardTitle>
                <CardDescription>Your scores over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={performanceTrend}>
                    <defs>
                      <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-background border rounded-lg shadow-lg p-3">
                              <p className="font-medium">{payload[0].payload.fullName}</p>
                              <p className="text-sm text-muted-foreground">{payload[0].payload.date}</p>
                              <p className="text-sm">Score: <span className="font-bold">{payload[0].value}%</span></p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      fill="url(#scoreGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Answer Distribution Pie */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Answer Distribution
                </CardTitle>
                <CardDescription>Correct vs Wrong vs Unanswered</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={answerDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {answerDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Daily Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Daily Activity (Last 14 Days)
              </CardTitle>
              <CardDescription>Quizzes taken and average scores per day</CardDescription>
            </CardHeader>
            <CardContent className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyActivity}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="displayDate" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} />
                  <Tooltip />
                  <Bar yAxisId="left" dataKey="quizzes" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Quizzes" />
                  <Line yAxisId="right" type="monotone" dataKey="avgScore" stroke="#10B981" strokeWidth={2} name="Avg Score %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECTIONS TAB */}
        <TabsContent value="sections" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Section Performance Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Section Performance</CardTitle>
                <CardDescription>Average accuracy per section</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sectionAnalysis} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tickLine={false} axisLine={false} domain={[0, 100]} />
                    <YAxis type="category" dataKey="section" tickLine={false} axisLine={false} width={100} />
                    <Tooltip />
                    <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} name="Accuracy %">
                      {sectionAnalysis.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Section Comparison</CardTitle>
                <CardDescription>Radar view of section performance</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="section" fontSize={12} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} fontSize={10} />
                    <Radar name="Accuracy" dataKey="accuracy" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.5} />
                    <Radar name="Avg Score" dataKey="avgScore" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Section Details Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectionAnalysis.map(section => (
              <Card key={section.sectionKey}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5" style={{ color: section.color }} />
                    {section.section}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Accuracy</span>
                    <span className="font-medium">{section.accuracy}%</span>
                  </div>
                  <Progress value={section.accuracy} className="h-2" />
                  
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-green-500/10 rounded p-2">
                      <CheckCircle2 className="h-4 w-4 mx-auto text-green-500 mb-1" />
                      <div className="font-medium">{section.correct}</div>
                      <div className="text-muted-foreground">Correct</div>
                    </div>
                    <div className="bg-red-500/10 rounded p-2">
                      <XCircle className="h-4 w-4 mx-auto text-red-500 mb-1" />
                      <div className="font-medium">{section.wrong}</div>
                      <div className="text-muted-foreground">Wrong</div>
                    </div>
                    <div className="bg-gray-500/10 rounded p-2">
                      <MinusCircle className="h-4 w-4 mx-auto text-gray-500 mb-1" />
                      <div className="font-medium">{section.unanswered}</div>
                      <div className="text-muted-foreground">Skipped</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* QUIZZES TAB */}
        <TabsContent value="quizzes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quiz History</CardTitle>
              <CardDescription>Detailed breakdown of each quiz attempt</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-3">
                  {quizBreakdown.map((quiz, index) => (
                    <Card key={quiz.id || index} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-medium line-clamp-1">{quiz.name}</h4>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {format(new Date(quiz.date), 'MMM d, yyyy')}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {quiz.subject}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold">{quiz.score}%</div>
                              <div className="text-xs text-muted-foreground">Score</div>
                            </div>
                            
                            <div className="hidden sm:flex gap-2 text-sm">
                              <div className="text-center px-2">
                                <div className="font-medium text-green-600">{quiz.correct}</div>
                                <div className="text-xs text-muted-foreground">✓</div>
                              </div>
                              <div className="text-center px-2">
                                <div className="font-medium text-red-600">{quiz.wrong}</div>
                                <div className="text-xs text-muted-foreground">✗</div>
                              </div>
                              <div className="text-center px-2">
                                <div className="font-medium text-gray-600">{quiz.unanswered}</div>
                                <div className="text-xs text-muted-foreground">-</div>
                              </div>
                            </div>
                            
                            <div className="text-center">
                              <div className="font-medium">{Math.round(quiz.timeSpent / 60)}m</div>
                              <div className="text-xs text-muted-foreground">Time</div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Progress bar showing answer distribution */}
                        <div className="mt-3 flex h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-green-500" 
                            style={{ width: `${(quiz.correct / quiz.total) * 100}%` }} 
                          />
                          <div 
                            className="bg-red-500" 
                            style={{ width: `${(quiz.wrong / quiz.total) * 100}%` }} 
                          />
                          <div 
                            className="bg-gray-400" 
                            style={{ width: `${(quiz.unanswered / quiz.total) * 100}%` }} 
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIME ANALYSIS TAB */}
        <TabsContent value="time" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Time Overview Cards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Time Overview
                </CardTitle>
                <CardDescription>Summary of your time management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-2xl font-bold">{overviewMetrics.averageTimePerQuiz}</div>
                    <div className="text-xs text-muted-foreground">Avg Quiz Time (min)</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-2xl font-bold">
                      {filteredResults.length > 0 
                        ? Math.round(filteredResults.reduce((acc, r) => acc + r.timeSpent, 0) / 60) 
                        : 0}
                    </div>
                    <div className="text-xs text-muted-foreground">Total Time (min)</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-2xl font-bold">
                      {filteredResults.length > 0 && filteredResults[0].answers.length > 0
                        ? formatTime(filteredResults.reduce((acc, r) => {
                            const avgQTime = r.answers.filter(a => a.timeSpent).length > 0
                              ? r.answers.filter(a => a.timeSpent).reduce((sum, a) => sum + (a.timeSpent || 0), 0) / r.answers.filter(a => a.timeSpent).length
                              : r.timeSpent / r.answers.length
                            return acc + avgQTime
                          }, 0) / filteredResults.length)
                        : '0:00'}
                    </div>
                    <div className="text-xs text-muted-foreground">Avg per Question</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <div className="text-2xl font-bold">
                      {formatTime(filteredResults.reduce((max, r) => {
                        const maxTime = r.answers.reduce((m, a) => Math.max(m, a.timeSpent || 0), 0)
                        return Math.max(max, maxTime)
                      }, 0))}
                    </div>
                    <div className="text-xs text-muted-foreground">Max on Single Q</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time vs Accuracy Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Time vs Accuracy</CardTitle>
                <CardDescription>Relationship between time spent and accuracy</CardDescription>
              </CardHeader>
              <CardContent className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredResults.map((r, idx) => ({
                    quiz: `Q${idx + 1}`,
                    time: Math.round(r.timeSpent / 60),
                    accuracy: r.answers.length > 0 ? Math.round((r.correctAnswers / r.answers.length) * 100) : 0
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="quiz" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="time" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 4 }} name="Time (min)" />
                    <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name="Accuracy %" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Per-Question Time Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Quiz Time Analysis
              </CardTitle>
              <CardDescription>Click on a quiz to view detailed time analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredResults.slice(0, 10).map((result, quizIdx) => {
                    const answersWithTime = result.answers.filter(a => a.timeSpent !== undefined && a.timeSpent > 0)
                    const avgTimePerQ = answersWithTime.length > 0 
                      ? answersWithTime.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / answersWithTime.length 
                      : (result.timeSpent * 1000) / result.answers.length
                    const maxTime = result.answers.reduce((max, a) => Math.max(max, a.timeSpent || 0), 0)
                    const minTime = result.answers.filter(a => a.timeSpent && a.timeSpent > 0).reduce((min, a) => Math.min(min, a.timeSpent || Infinity), Infinity)
                    
                    return (
                      <Link 
                        key={result._id || quizIdx} 
                        href={`/analytics/time/${result._id || result.id}`}
                        className="block"
                      >
                        <div className="border rounded-lg p-4 hover:bg-muted/50 hover:border-primary/50 transition-all cursor-pointer group">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold truncate group-hover:text-primary transition-colors">{result.quizName}</h4>
                                <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {format(new Date(result.date), 'MMM dd, yyyy')} • {result.answers.length} questions
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-3 sm:gap-6">
                              {/* Time Stats */}
                              <div className="hidden sm:flex items-center gap-4 text-xs">
                                <div className="text-center">
                                  <div className="font-semibold text-sm">{Math.round(result.timeSpent / 60)}m</div>
                                  <div className="text-muted-foreground">Total</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-semibold text-sm">{formatTime(avgTimePerQ)}</div>
                                  <div className="text-muted-foreground">Avg/Q</div>
                                </div>
                                {answersWithTime.length > 0 && (
                                  <div className="text-center">
                                    <div className="font-semibold text-sm text-orange-500">{formatTime(maxTime)}</div>
                                    <div className="text-muted-foreground">Max</div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Accuracy Badge */}
                              <Badge variant={result.correctAnswers / result.answers.length >= 0.7 ? "default" : result.correctAnswers / result.answers.length >= 0.5 ? "secondary" : "destructive"}>
                                {Math.round((result.correctAnswers / result.answers.length) * 100)}%
                              </Badge>
                              
                              <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </div>
                          
                          {/* Mobile time stats */}
                          <div className="flex sm:hidden items-center gap-4 mt-3 pt-3 border-t text-xs">
                            <div className="flex-1 text-center">
                              <div className="font-semibold">{Math.round(result.timeSpent / 60)}m</div>
                              <div className="text-muted-foreground">Total</div>
                            </div>
                            <div className="flex-1 text-center">
                              <div className="font-semibold">{formatTime(avgTimePerQ)}</div>
                              <div className="text-muted-foreground">Avg/Q</div>
                            </div>
                            {answersWithTime.length > 0 && (
                              <div className="flex-1 text-center">
                                <div className="font-semibold text-orange-500">{formatTime(maxTime)}</div>
                                <div className="text-muted-foreground">Max</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                  
                  {filteredResults.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No quiz results yet</p>
                      <p className="text-sm mt-1">Complete some quizzes to see your time analysis</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Time Distribution by Section */}
          <Card>
            <CardHeader>
              <CardTitle>Average Time by Section</CardTitle>
              <CardDescription>Compare time spent across different sections</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(() => {
                  const sectionTimes: { [key: string]: { total: number; count: number } } = {}
                  
                  filteredResults.forEach(result => {
                    result.answers.forEach(answer => {
                      const section = answer.section || 'unknown'
                      if (!sectionTimes[section]) {
                        sectionTimes[section] = { total: 0, count: 0 }
                      }
                      sectionTimes[section].total += answer.timeSpent || 0
                      sectionTimes[section].count += 1
                    })
                  })
                  
                  return Object.entries(sectionTimes)
                    .filter(([section]) => section !== 'unknown')
                    .map(([section, data]) => ({
                      section: section.charAt(0).toUpperCase() + section.slice(1),
                      avgTime: data.count > 0 ? Math.round((data.total / data.count) / 1000) : 0,
                      questions: data.count
                    }))
                })()}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="section" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} />
                  <Tooltip formatter={(value, name) => [name === 'avgTime' ? `${value}s` : value, name === 'avgTime' ? 'Avg Time' : 'Questions']} />
                  <Bar dataKey="avgTime" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Avg Time (s)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TRENDS TAB */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Score vs Accuracy Trend</CardTitle>
                <CardDescription>Compare your score and accuracy over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} />
                    <Tooltip />
                    <Line type="monotone" dataKey="score" stroke="#8B5CF6" strokeWidth={2} name="Score %" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={2} name="Accuracy %" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Key insights from your quiz history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Award className="h-8 w-8 text-yellow-500" />
                      <div>
                        <p className="font-medium">Best Performance</p>
                        <p className="text-sm text-muted-foreground">Highest score achieved</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{overviewMetrics.highestScore}%</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="h-8 w-8 text-blue-500" />
                      <div>
                        <p className="font-medium">Consistency</p>
                        <p className="text-sm text-muted-foreground">Score range spread</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{overviewMetrics.highestScore - overviewMetrics.lowestScore}%</div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="h-8 w-8 text-purple-500" />
                      <div>
                        <p className="font-medium">Total Study Time</p>
                        <p className="text-sm text-muted-foreground">Time invested in quizzes</p>
                      </div>
                    </div>
                    <div className="text-2xl font-bold">{Math.round(overviewMetrics.totalTimeSpent / 3600)}h {Math.round((overviewMetrics.totalTimeSpent % 3600) / 60)}m</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* DISTRIBUTION TAB */}
        <TabsContent value="distribution" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>How your scores are distributed</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="range" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Quizzes" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Zones</CardTitle>
                <CardDescription>Quiz count by performance level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { label: 'Excellent (81-100%)', range: '81-100', color: 'bg-green-500', icon: '🏆' },
                    { label: 'Good (61-80%)', range: '61-80', color: 'bg-blue-500', icon: '👍' },
                    { label: 'Average (41-60%)', range: '41-60', color: 'bg-yellow-500', icon: '📊' },
                    { label: 'Below Average (21-40%)', range: '21-40', color: 'bg-orange-500', icon: '📈' },
                    { label: 'Needs Improvement (0-20%)', range: '0-20', color: 'bg-red-500', icon: '💪' },
                  ].map(zone => {
                    const count = scoreDistribution.find(d => d.range === zone.range)?.count || 0
                    const percentage = overviewMetrics.totalQuizzes > 0 ? (count / overviewMetrics.totalQuizzes) * 100 : 0
                    
                    return (
                      <div key={zone.range} className="flex items-center gap-3">
                        <span className="text-xl">{zone.icon}</span>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{zone.label}</span>
                            <span className="font-medium">{count} quizzes</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${zone.color}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
