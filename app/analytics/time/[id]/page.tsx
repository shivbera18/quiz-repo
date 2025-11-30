"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowLeft,
  Timer,
  Clock,
  Zap,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  MinusCircle,
  BarChart3,
  Target,
  AlertTriangle,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
} from "recharts"

interface QuestionTimeData {
  id: string
  questionNumber: number
  question: string
  timeSpent: number // in milliseconds
  isCorrect: boolean | null
  selectedAnswer: number | null
  correctAnswer: number
  section: string
}

interface ResultData {
  _id: string
  quizId: string
  quizName: string
  date: string
  timeSpent: number // total time in seconds
  totalScore: number
  correctAnswers: number
  wrongAnswers: number
  unanswered: number
  answers: QuestionTimeData[]
  questions?: QuestionTimeData[]
  subject?: string
  chapter?: string
}

// Format time from milliseconds
function formatTimeMs(ms: number): string {
  if (!ms || isNaN(ms) || ms <= 0) return "0s"
  if (ms < 1000) return `${Math.round(ms)}ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.round(seconds % 60)
  return `${minutes}m ${remainingSeconds}s`
}

// Format time from seconds
function formatTimeSec(sec: number): string {
  if (!sec || isNaN(sec)) return "0s"
  if (sec < 60) return `${Math.round(sec)}s`
  const minutes = Math.floor(sec / 60)
  const remainingSeconds = Math.round(sec % 60)
  return `${minutes}m ${remainingSeconds}s`
}

// Safe date formatter
function formatDateSafe(dateStr: string | undefined | null, formatStr: string = "MMMM d, yyyy"): string {
  if (!dateStr) return "Unknown date"
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return "Unknown date"
    return format(date, formatStr)
  } catch {
    return "Unknown date"
  }
}

export default function TimeAnalysisPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [result, setResult] = useState<ResultData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const resultId = params?.id as string

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/login")
      return
    }

    if (!resultId || !user) return

    const fetchResult = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/results/${resultId}`, {
          headers: {
            Authorization: `Bearer ${user.token || ""}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch result")
        }

        const data = await response.json()
        // API returns { result: {...} }, extract the result object
        const resultData = data.result || data
        console.log("Fetched result data:", resultData) // Debug log
        setResult(resultData)
      } catch (err) {
        console.error("Error fetching result:", err)
        setError("Failed to load time analysis data")
      } finally {
        setLoading(false)
      }
    }

    fetchResult()
  }, [resultId, user, authLoading, router])

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading time analysis...</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Unable to Load Data</h3>
            <p className="text-muted-foreground mb-6">{error || "Result not found"}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
              <Link href="/analytics">
                <Button>View Analytics</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Process time data - ensure we have an array
  const rawQuestions = result.questions || result.answers || []
  const questions = Array.isArray(rawQuestions) ? rawQuestions : []
  
  // Debug log to see what we're getting
  console.log("Result data:", { 
    hasQuestions: !!result.questions, 
    hasAnswers: !!result.answers,
    questionsType: typeof result.questions,
    answersType: typeof result.answers,
    questionsLength: questions.length,
    timeSpent: result.timeSpent 
  })
  
  // Handle case where time might be in seconds or milliseconds
  const normalizeTime = (time: number) => {
    if (!time || time <= 0) return 0
    // If time is less than 500, it's likely in seconds, convert to ms
    return time < 500 ? time * 1000 : time
  }

  // Normalize total time - heuristic: if < 10000, assume seconds (unless it's a very short quiz in ms)
  // But since we have question times in ms (e.g. 11556), total time is likely in ms too if it's large
  const normalizeTotalTime = (time: number) => {
    if (!time || time <= 0) return 0
    // If time is > 10000 (10 seconds), assume ms. If < 10000, assume seconds.
    // 10000 seconds is ~2.7 hours. 10000 ms is 10 seconds.
    return time < 10000 ? time * 1000 : time
  }
  
  const totalQuizTimeMs = normalizeTotalTime(result.timeSpent || 0)
  
  // Check if we have per-question time data
  const hasPerQuestionTime = questions.length > 0 && questions.some((q: any) => q.timeSpent && q.timeSpent > 0)
  
  // Calculate estimated time per question if no per-question time data
  const estimatedTimePerQuestion = questions.length > 0 ? totalQuizTimeMs / questions.length : 0
  
  // Normalize all questions - use actual time if available, otherwise estimate
  const normalizedQuestions = questions.map((q: any, idx: number) => {
    const selectedAnswer = q.selectedAnswer ?? q.userAnswer ?? null
    const isUnanswered = q.isUnanswered === true || selectedAnswer === null || selectedAnswer === undefined
    
    return {
      ...q,
      id: q.id || q.questionId || `q-${idx}`,
      questionNumber: idx + 1,
      question: q.question || q.questionText || `Question ${idx + 1}`,
      timeSpent: hasPerQuestionTime 
        ? normalizeTime(q.timeSpent || 0)
        : estimatedTimePerQuestion, // Use estimated time when no per-question data
      isCorrect: q.isCorrect,
      selectedAnswer: selectedAnswer,
      userAnswer: selectedAnswer, // Keep both for compatibility
      correctAnswer: q.correctAnswer ?? 0,
      section: q.section || q.category || "General",
      isEstimated: !q.timeSpent || q.timeSpent <= 0, // Flag to show if time is estimated
      isUnanswered: isUnanswered,
    }
  })

  const totalTime = normalizedQuestions.reduce((sum: number, q: any) => sum + q.timeSpent, 0)
  // Use calculated total time from questions if available and reasonable, otherwise use reported total time
  const displayTotalTime = hasPerQuestionTime && totalTime > 0 ? totalTime : totalQuizTimeMs
  const avgTime = normalizedQuestions.length > 0 ? totalTime / normalizedQuestions.length : 0
  const maxTime = normalizedQuestions.length > 0 ? Math.max(...normalizedQuestions.map((q: any) => q.timeSpent)) : 0
  const minTime = normalizedQuestions.length > 0 ? Math.min(...normalizedQuestions.map((q: any) => q.timeSpent)) : 0
  
  const slowestQuestion = normalizedQuestions.find((q: any) => q.timeSpent === maxTime)
  const fastestQuestion = normalizedQuestions.find((q: any) => q.timeSpent === minTime)

  // Time by correctness
  const correctQuestions = normalizedQuestions.filter((q: any) => q.isCorrect === true)
  const wrongQuestions = normalizedQuestions.filter((q: any) => q.isCorrect === false && !q.isUnanswered)
  const unansweredQuestions = normalizedQuestions.filter((q: any) => q.isUnanswered === true)
  
  const avgTimeCorrect = correctQuestions.length > 0 
    ? correctQuestions.reduce((sum: number, q: any) => sum + q.timeSpent, 0) / correctQuestions.length 
    : 0
  const avgTimeWrong = wrongQuestions.length > 0 
    ? wrongQuestions.reduce((sum: number, q: any) => sum + q.timeSpent, 0) / wrongQuestions.length 
    : 0
  const avgTimeUnanswered = unansweredQuestions.length > 0 
    ? unansweredQuestions.reduce((sum: number, q: any) => sum + q.timeSpent, 0) / unansweredQuestions.length 
    : 0

  // Section-wise time analysis
  const sectionTimes: { [key: string]: { total: number; count: number; correct: number; wrong: number } } = {}
  normalizedQuestions.forEach((q: any) => {
    const section = q.section || "General"
    if (!sectionTimes[section]) {
      sectionTimes[section] = { total: 0, count: 0, correct: 0, wrong: 0 }
    }
    sectionTimes[section].total += q.timeSpent
    sectionTimes[section].count += 1
    if (q.isCorrect) sectionTimes[section].correct += 1
    else if (q.isCorrect === false) sectionTimes[section].wrong += 1
  })

  const sectionData = Object.entries(sectionTimes).map(([section, data]) => ({
    section: section.charAt(0).toUpperCase() + section.slice(1),
    avgTime: data.total / data.count,
    totalTime: data.total,
    count: data.count,
    accuracy: data.count > 0 ? Math.round((data.correct / data.count) * 100) : 0,
  }))

  // Chart data for per-question time
  const chartData = normalizedQuestions.map((q: any, idx: number) => ({
    name: `Q${idx + 1}`,
    time: Math.round(q.timeSpent / 1000), // Convert to seconds for display
    timeMs: q.timeSpent,
    status: q.isCorrect === true ? "correct" : q.isCorrect === false ? "wrong" : "unanswered",
    isCorrect: q.isCorrect,
    section: q.section || "General",
    isEstimated: q.isEstimated || false,
  }))

  // Time distribution buckets
  const timeDistribution = [
    { range: "0-10s", min: 0, max: 10000, count: 0, correct: 0 },
    { range: "10-30s", min: 10000, max: 30000, count: 0, correct: 0 },
    { range: "30-60s", min: 30000, max: 60000, count: 0, correct: 0 },
    { range: "1-2m", min: 60000, max: 120000, count: 0, correct: 0 },
    { range: "2m+", min: 120000, max: Infinity, count: 0, correct: 0 },
  ]
  
  normalizedQuestions.forEach((q: any) => {
    const bucket = timeDistribution.find((b) => q.timeSpent >= b.min && q.timeSpent < b.max)
    if (bucket) {
      bucket.count += 1
      if (q.isCorrect) bucket.correct += 1
    }
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "correct": return "#22c55e"
      case "wrong": return "#ef4444"
      default: return "#6b7280"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "correct": return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case "wrong": return <XCircle className="h-4 w-4 text-red-500" />
      default: return <MinusCircle className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{result.quizName || "Quiz"}</h1>
            <p className="text-muted-foreground text-sm">
              Time Analysis • {formatDateSafe(result.date)}
            </p>
          </div>
          <Link href={`/results/${resultId}`}>
            <Button variant="outline">View Full Results</Button>
          </Link>
        </div>

        {/* Estimated Time Notice */}
        {!hasPerQuestionTime && questions.length > 0 && (
          <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">Estimated Time Data</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Per-question time tracking wasn&apos;t available for this quiz. Showing estimated time ({formatTimeMs(estimatedTimePerQuestion)}) 
                    per question based on your total time of {formatTimeMs(displayTotalTime)}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Questions Notice */}
        {questions.length === 0 && (
          <Card className="mb-6 border-orange-200 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="font-medium text-orange-800 dark:text-orange-200">No Question Data Available</p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Detailed question data is not available for this quiz result. 
                    Total time spent: {formatTimeMs(displayTotalTime)}.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Question-wise Time Breakdown - FIRST PRIORITY */}
        {questions.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Timer className="h-5 w-5" />
              Time per Question
            </CardTitle>
            <CardDescription>
              {hasPerQuestionTime 
                ? "Detailed time spent on each question" 
                : "Estimated time per question based on total quiz duration"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {normalizedQuestions.map((q: any, idx: number) => {
                  const timeVsAvg = q.timeSpent - avgTime
                  const percentDiff = avgTime > 0 ? Math.round((timeVsAvg / avgTime) * 100) : 0
                  
                  return (
                    <div 
                      key={q.id || idx} 
                      className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-semibold">
                        {idx + 1}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(q.isUnanswered ? "unanswered" : q.isCorrect === true ? "correct" : "wrong")}
                          <span className="text-sm font-medium capitalize">
                            {q.isUnanswered ? "Unanswered" : q.isCorrect === true ? "Correct" : "Wrong"}
                          </span>
                          {q.section && q.section !== "General" && (
                            <Badge variant="outline" className="text-xs">{q.section}</Badge>
                          )}
                          {q.isEstimated && (
                            <Badge variant="secondary" className="text-xs">~estimated</Badge>
                          )}
                        </div>
                        {q.question && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            {q.question.substring(0, 100)}{q.question.length > 100 ? '...' : ''}
                          </p>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <div className="font-semibold text-lg">{formatTimeMs(q.timeSpent)}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Timer className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Time</p>
                  <p className="text-xl font-bold">{formatTimeMs(displayTotalTime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Avg per Question</p>
                  <p className="text-xl font-bold">{formatTimeMs(avgTime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Fastest</p>
                  <p className="text-xl font-bold">{formatTimeMs(minTime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Slowest</p>
                  <p className="text-xl font-bold">{formatTimeMs(maxTime)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Time by Result Type */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Correct Answers</span>
                </div>
                <Badge variant="secondary">{correctQuestions.length}</Badge>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-green-600">{formatTimeMs(avgTimeCorrect)}</p>
                <p className="text-xs text-muted-foreground">avg time per question</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium">Wrong Answers</span>
                </div>
                <Badge variant="secondary">{wrongQuestions.length}</Badge>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-red-600">{formatTimeMs(avgTimeWrong)}</p>
                <p className="text-xs text-muted-foreground">avg time per question</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MinusCircle className="h-5 w-5 text-gray-500" />
                  <span className="font-medium">Unanswered</span>
                </div>
                <Badge variant="secondary">{unansweredQuestions.length}</Badge>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold text-gray-600">{formatTimeMs(avgTimeUnanswered)}</p>
                <p className="text-xs text-muted-foreground">avg time per question</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Per Question Time Grid (Mobile Friendly) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Time Overview
              </CardTitle>
              <CardDescription>Visual overview of time spent on each question</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ScrollArea className="h-full pr-4">
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                  {normalizedQuestions.map((q: any, idx: number) => (
                    <div 
                      key={idx}
                      className={`
                        flex flex-col items-center justify-center p-2 rounded-md border text-center text-xs
                        ${q.isCorrect === true ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800" : 
                          q.isCorrect === false && !q.isUnanswered ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800" : 
                          "bg-gray-50 border-gray-200 dark:bg-gray-800/50 dark:border-gray-700"}
                      `}
                    >
                      <span className="font-semibold mb-1">Q{idx + 1}</span>
                      <span className="font-mono">{formatTimeMs(q.timeSpent)}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Time Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Time Distribution
              </CardTitle>
              <CardDescription>Questions grouped by time spent</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeDistribution.filter((d) => d.count > 0)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="range" tickLine={false} axisLine={false} width={60} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="bg-background border rounded-lg shadow-lg p-3">
                            <p className="font-medium">{data.range}</p>
                            <p className="text-sm">Questions: {data.count}</p>
                            <p className="text-sm">Correct: {data.correct} ({Math.round((data.correct / data.count) * 100)}%)</p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Section-wise Time Analysis */}
        {sectionData.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Time by Section</CardTitle>
              <CardDescription>Average time spent per section</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectionData.map((section) => (
                  <div key={section.section} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{section.section}</h4>
                      <Badge variant="outline">{section.count} Q</Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Avg Time</span>
                        <span className="font-medium">{formatTimeMs(section.avgTime)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Time</span>
                        <span className="font-medium">{formatTimeMs(section.totalTime)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className="font-medium">{section.accuracy}%</span>
                      </div>
                      <Progress value={section.accuracy} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Insights */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Time Management Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {avgTimeCorrect < avgTimeWrong && avgTimeCorrect > 0 && (
                <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-green-700 dark:text-green-400">Good Time Management on Correct Answers</p>
                    <p className="text-sm text-green-600 dark:text-green-500">
                      You spent less time ({formatTimeMs(avgTimeCorrect)}) on correct answers compared to wrong ones ({formatTimeMs(avgTimeWrong)}). 
                      This suggests you're confident when you know the answer.
                    </p>
                  </div>
                </div>
              )}
              
              {avgTimeCorrect > avgTimeWrong && avgTimeWrong > 0 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-700 dark:text-yellow-400">Consider Faster Decision Making</p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-500">
                      You spent more time on correct answers ({formatTimeMs(avgTimeCorrect)}) than wrong ones ({formatTimeMs(avgTimeWrong)}). 
                      You might be overthinking questions you eventually get right.
                    </p>
                  </div>
                </div>
              )}
              
              {slowestQuestion && slowestQuestion.isCorrect === false && (
                <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-orange-700 dark:text-orange-400">Slowest Question Was Wrong</p>
                    <p className="text-sm text-orange-600 dark:text-orange-500">
                      Question #{normalizedQuestions.indexOf(slowestQuestion) + 1} took the longest ({formatTimeMs(maxTime)}) but was answered incorrectly. 
                      Consider moving on faster when stuck.
                    </p>
                  </div>
                </div>
              )}
              
              {unansweredQuestions.length > 0 && (
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                  <MinusCircle className="h-5 w-5 text-gray-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-700 dark:text-gray-400">Unanswered Questions Analysis</p>
                    <p className="text-sm text-gray-600 dark:text-gray-500">
                      You left {unansweredQuestions.length} questions unanswered with an average view time of {formatTimeMs(avgTimeUnanswered)}. 
                      {avgTimeUnanswered < avgTime ? " You quickly identified difficult questions." : " You might benefit from flagging difficult questions to return later."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
