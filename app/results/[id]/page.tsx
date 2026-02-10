"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  CheckCircle,
  XCircle,
  Home,
  RotateCcw,
  AlertTriangle,
  Minus,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Clock,
  Timer,
} from "lucide-react"
import MathRenderer from "@/components/math-renderer"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { useAuth } from "@/hooks/use-auth"

interface QuestionResult {
  question: string
  options: string[]
  selectedAnswer: number
  correctAnswer: number
  isCorrect: boolean
  section: string
  explanation?: string
  image?: string
  timeSpent?: number // Time spent on this question in milliseconds
}

// Helper function to format milliseconds to mm:ss format
const formatTime = (ms: number): string => {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

// Helper function to format explanation text with step highlighting
const formatExplanation = (text: string) => {
  if (!text) return "No explanation available";

  // Split by "Step" but keep the "Step" in the result
  const parts = text.split(/(Step\s+\d+)/i);

  const result = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const stepMatch = part.match(/^Step\s+(\d+)$/i);
    if (stepMatch) {
      let stepText = part;
      let followingText = '';
      // Check if next part starts with :
      if (i + 1 < parts.length && parts[i + 1].startsWith(':')) {
        const nextPart = parts[i + 1];
        const colonIndex = nextPart.indexOf(':');
        if (colonIndex !== -1) {
          stepText += nextPart.substring(0, colonIndex + 1); // Include up to colon
          followingText = nextPart.substring(colonIndex + 1); // Text after colon
        } else {
          stepText += nextPart;
        }
        i++; // skip next
      }
      result.push(
        <span key={result.length} className="block mt-2 font-bold text-blue-800 dark:text-blue-200">
          {stepText}
        </span>
      );
      if (followingText) {
        result.push(
          <span key={result.length} className="whitespace-pre-line">
            {followingText}
          </span>
        );
      }
    } else if (part) {
      result.push(
        <span key={result.length} className="whitespace-pre-line">
          {part}
        </span>
      );
    }
  }
  return result;
};

interface Result {
  _id: string
  date: string
  quizName: string
  quizId: string
  totalScore: number
  rawScore?: number
  positiveMarks?: number
  negativeMarks?: number
  correctAnswers?: number
  wrongAnswers?: number
  unanswered?: number
  sections: {
    reasoning: number
    quantitative: number
    english: number
  }
  questions: QuestionResult[]
  negativeMarking?: boolean
  negativeMarkValue?: number
  timeSpent?: number
}

export default function ResultsPage({ params }: { params: { id: string } }) {
  const { user, loading: authLoading } = useAuth()
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSection, setSelectedSection] = useState("all")
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Helper function to safely parse questions data
  const parseResultData = (resultData: any): Result => {
    const rawQuestions = (() => {
      if (Array.isArray(resultData.questions)) {
        return resultData.questions;
      } else if (typeof resultData.questions === 'string') {
        try {
          const parsed = JSON.parse(resultData.questions);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    })();

    return {
      ...resultData,
      questions: rawQuestions.map((q: any) => {
        // Handle both property names: selectedAnswer (legacy/interface) and userAnswer (saved by quiz page)
        const answer = q.selectedAnswer !== undefined ? q.selectedAnswer : q.userAnswer;
        
        return {
          ...q,
          selectedAnswer: (answer === null || answer === undefined) ? -1 : answer
        };
      }),
      sections: typeof resultData.sections === 'string' 
        ? (() => {
            try { return JSON.parse(resultData.sections); } 
            catch { return { reasoning: 0, quantitative: 0, english: 0 }; }
          })()
        : (resultData.sections || { reasoning: 0, quantitative: 0, english: 0 })
    };
  }

  useEffect(() => {
    if (authLoading) return
    
    const loadResult = async () => {
      try {
        console.log("Loading result for ID:", params.id)
        
        // First try to fetch from API
        if (user?.token) {
          console.log("Trying to fetch from API...")
          const response = await fetch(`/api/results/${params.id}`, {
            headers: {
              Authorization: `Bearer ${user.token}`,
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          })

          if (response.ok) {
            const data = await response.json()
            console.log("API response:", data)
            if (data.result) {
              setResult(parseResultData(data.result))
              setLoading(false)
              return
            }
          } else if (response.status === 401) {
            console.log("Token invalid or expired, falling back to localStorage")
          } else {
            console.error("API error:", response.status, response.statusText)
          }
        }

        // Fallback to localStorage
        console.log("Falling back to localStorage...")
        const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
        console.log("LocalStorage results count:", results.length)
        const foundResult = results.find((r: Result) => r._id === params.id)
        
        if (foundResult) {
          console.log("Found result in localStorage:", foundResult._id)
          setResult(parseResultData(foundResult))
        } else {
          console.log("Result not found in localStorage either")
          setError("Result not found. It may have been deleted or the link is invalid.")
        }
      } catch (error) {
        console.error("Error loading result:", error)
        
        // Try localStorage as final fallback
        try {
          const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
          const foundResult = results.find((r: Result) => r._id === params.id)
          
          if (foundResult) {
            setResult(parseResultData(foundResult))
          } else {
            setError("Failed to load quiz result. Please try again.")
          }
        } catch (localStorageError) {
          setError("Failed to load quiz result. Please try again.")
        }
      } finally {
        setLoading(false)
      }
    }

    loadResult()
  }, [params.id, user, authLoading])

  const toggleQuestion = (index: number) => {
    const newOpenQuestions = new Set(openQuestions)
    if (newOpenQuestions.has(index)) {
      newOpenQuestions.delete(index)
    } else {
      newOpenQuestions.add(index)
    }
    setOpenQuestions(newOpenQuestions)
  }

  const toggleAllQuestions = () => {
    if (!result || !Array.isArray(result.questions)) return

    if (openQuestions.size === result.questions.length) {
      setOpenQuestions(new Set())
    } else {
      setOpenQuestions(new Set(Array.from({ length: result.questions.length }, (_, i) => i)))
    }
  }

  const getFilteredQuestions = () => {
    if (!result || !Array.isArray(result.questions)) return []
    if (selectedSection === "all") return result.questions
    return result.questions.filter((q) => q.section === selectedSection)
  }

  const getSectionStats = (section: string) => {
    if (!result || !Array.isArray(result.questions)) return { correct: 0, total: 0, wrong: 0, unanswered: 0 }
    const sectionQuestions = result.questions.filter((q) => q.section === section)
    const correct = sectionQuestions.filter((q) => q.isCorrect).length
    const wrong = sectionQuestions.filter((q) => !q.isCorrect && q.selectedAnswer !== -1).length
    const unanswered = sectionQuestions.filter((q) => q.selectedAnswer === -1).length
    return { correct, total: sectionQuestions.length, wrong, unanswered }
  }

  const getPerformanceAnalysis = () => {
    if (!result || !Array.isArray(result.questions)) return null

    const totalQuestions = Array.isArray(result.questions) ? result.questions.length : 0
    const correct = result.correctAnswers || (Array.isArray(result.questions) ? result.questions.filter((q) => q.isCorrect).length : 0)
    const wrong = result.wrongAnswers || (Array.isArray(result.questions) ? result.questions.filter((q) => !q.isCorrect && q.selectedAnswer !== -1).length : 0)
    const unanswered = result.unanswered || (Array.isArray(result.questions) ? result.questions.filter((q) => q.selectedAnswer === -1).length : 0)

    // Performance by difficulty (based on section performance)
    const sectionPerformance = [
      { section: "Reasoning", score: Number((result.sections?.reasoning || 0).toFixed(2)), color: "#8884d8" },
      { section: "Quantitative", score: Number((result.sections?.quantitative || 0).toFixed(2)), color: "#82ca9d" },
      { section: "English", score: Number((result.sections?.english || 0).toFixed(2)), color: "#ffc658" },
    ].filter((s) => s.score > 0)

    // Answer distribution
    const answerDistribution = [
      { name: "Correct", value: correct, color: "#22c55e" },
      { name: "Wrong", value: wrong, color: "#ef4444" },
      { name: "Unanswered", value: unanswered, color: "#6b7280" },
    ]

    // Time analysis
    const timePerQuestion = result.timeSpent ? Math.round(result.timeSpent / totalQuestions) : 0
    const timeEfficiency =
      result.timeSpent && result.timeSpent > 0 ? Math.round((correct / (result.timeSpent / 60)) * 100) / 100 : 0

    // Performance insights
    const insights = []

    if (result.totalScore >= 80) {
      insights.push({ type: "success", message: "Excellent performance! You're well prepared." })
    } else if (result.totalScore >= 60) {
      insights.push({ type: "warning", message: "Good performance, but there's room for improvement." })
    } else {
      insights.push({ type: "error", message: "Need more practice. Focus on weak areas." })
    }

    if (unanswered > totalQuestions * 0.1) {
      insights.push({ type: "warning", message: "Too many unanswered questions. Work on time management." })
    }

    if (result.negativeMarking && wrong > correct * 0.5) {
      insights.push({ type: "error", message: "High wrong answers. Be more careful with negative marking." })
    }

    const weakestSection = sectionPerformance.reduce(
      (min, section) => (section.score < min.score ? section : min),
      sectionPerformance[0],
    )

    if (weakestSection && weakestSection.score < 50) {
      insights.push({ type: "warning", message: `Focus on ${weakestSection.section} - your weakest area.` })
    }

    return {
      sectionPerformance,
      answerDistribution,
      timePerQuestion,
      timeEfficiency,
      insights,
      accuracy: Math.round((correct / (correct + wrong)) * 100) || 0,
      attemptRate: Math.round(((correct + wrong) / totalQuestions) * 100),
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card variant="neobrutalist" className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground font-medium">Loading results...</p>
        </Card>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 mobile-header-safe-zone">
        <Card variant="neobrutalist" className="p-8 text-center max-w-md w-full">
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <p className="text-muted-foreground font-bold mb-4">
            {error || "Result not found"}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            This could happen if the result was not properly saved or the link is invalid.
          </p>
          <div className="grid grid-cols-1 gap-3">
            <Link href="/dashboard">
              <Button variant="neobrutalist" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="outline" className="w-full border-2 border-black dark:border-white/65">
                View History
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const analysis = getPerformanceAnalysis()

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="mb-6">
          {/* Mobile Header */}
          <div className="md:hidden">
            <Card variant="neobrutalist" className="p-4 mb-4">
              <h1 className="text-xl sm:text-2xl font-black break-words">Quiz Results</h1>
              <p className="text-muted-foreground text-sm mt-1 break-words font-medium">
                {result.quizName} • Completed on {new Date(result.date).toLocaleDateString()}
              </p>
            </Card>
            <div className="grid grid-cols-1 gap-2">
              <Link href={`/quiz/${result.quizId}`}>
                <Button variant="neobrutalist" className="w-full">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Retake Quiz
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="neobrutalist" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>

          {/* Desktop Header */}
          <div className="hidden md:block">
            <Card variant="neobrutalist" className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="min-w-0 flex-1">
                  <h1 className="text-2xl lg:text-3xl font-black truncate">Quiz Results</h1>
                  <p className="text-muted-foreground text-sm lg:text-base break-words font-medium">
                    {result.quizName} • Completed on {new Date(result.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <Link href={`/quiz/${result.quizId}`}>
                    <Button variant="neobrutalist">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retake Quiz
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="neobrutalist">
                      <Home className="h-4 w-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Negative Marking Info - Only show when quiz actually has negative marking enabled */}
        {result.negativeMarking === true && result.negativeMarkValue && result.negativeMarkValue > 0 && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This quiz had negative marking of -{result.negativeMarkValue} marks per wrong answer.
            </AlertDescription>
          </Alert>
        )}

        {/* Score Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card variant="neobrutalist" className="md:col-span-2 lg:col-span-1 p-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-black text-blue-600 mb-2">{Number(result.totalScore).toFixed(2)}%</h2>
            <p className="text-muted-foreground text-sm font-medium">Final Score</p>
            {result.rawScore !== undefined && (
              <div className="mt-4 space-y-1 text-sm font-medium">
                <p>Raw Score: {result.rawScore.toFixed(2)}</p>
                {result.negativeMarking && result.negativeMarks && result.negativeMarks > 0 && (
                  <p className="text-red-600 font-bold">Penalty: -{result.negativeMarks}</p>
                )}
              </div>
            )}
          </Card>

          <Card variant="neobrutalist" className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h3 className="text-lg font-bold">Correct</h3>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-green-600">
              {result.correctAnswers || (Array.isArray(result.questions) ? result.questions.filter((q) => q.isCorrect).length : 0)}
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              +{result.positiveMarks || (Array.isArray(result.questions) ? result.questions.filter((q) => q.isCorrect).length : 0)} marks
            </p>
          </Card>

          <Card variant="neobrutalist" className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <h3 className="text-lg font-bold">Wrong</h3>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-red-600">
              {result.wrongAnswers || (Array.isArray(result.questions) ? result.questions.filter((q) => !q.isCorrect && q.selectedAnswer !== -1).length : 0)}
            </div>
            {result.negativeMarking && (
              <p className="text-sm text-muted-foreground font-medium">-{result.negativeMarks || 0} marks</p>
            )}
          </Card>

          <Card variant="neobrutalist" className="p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-2">
              <Minus className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-bold">Unanswered</h3>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-600">
              {result.unanswered || (Array.isArray(result.questions) ? result.questions.filter((q) => q.selectedAnswer === -1).length : 0)}
            </div>
            <p className="text-sm text-muted-foreground font-medium">No penalty</p>
          </Card>
        </div>

        {/* Advanced Analysis */}
        {analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Performance Insights */}
            <Card variant="neobrutalist">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-black">
                  <TrendingUp className="h-5 w-5" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-blue-100 dark:bg-blue-900/30 border-2 border-black dark:border-white/65 rounded-lg">
                    <div className="text-2xl font-black">{analysis.accuracy}%</div>
                    <p className="text-xs text-muted-foreground font-medium">Accuracy</p>
                  </div>
                  <div className="text-center p-3 bg-green-100 dark:bg-green-900/30 border-2 border-black dark:border-white/65 rounded-lg">
                    <div className="text-2xl font-black">{analysis.attemptRate}%</div>
                    <p className="text-xs text-muted-foreground font-medium">Attempt Rate</p>
                  </div>
                </div>

                {/* Show only the most important insight */}
                {analysis.insights.length > 0 && (
                  <Alert variant={analysis.insights[0].type === "error" ? "destructive" : "default"} className="border-2 border-black dark:border-white/65">
                    <AlertDescription className="font-medium text-sm">{analysis.insights[0].message}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Answer Distribution */}
            <Card variant="neobrutalist">
              <CardHeader>
                <CardTitle className="font-black">Answer Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[180px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analysis.answerDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={70}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {analysis.answerDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {Object.entries(result.sections)
            .filter(([section, score]) => score > 0 && getSectionStats(section).total > 0)
            .map(([section, score]) => {
              const stats = getSectionStats(section)
              const sectionColors: { [key: string]: { bg: string; border: string; progress: string } } = {
                reasoning: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-l-purple-500', progress: 'bg-purple-500' },
                quantitative: { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-l-green-500', progress: 'bg-green-500' },
                english: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-l-yellow-500', progress: 'bg-yellow-500' },
              }
              const colors = sectionColors[section] || { bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-l-gray-500', progress: 'bg-gray-500' }
              
              return (
                <Card variant="neobrutalist" key={section} className={`border-l-4 ${colors.border} ${colors.bg}`}>
                  <CardHeader>
                    <CardTitle className="text-lg capitalize font-black">{section}</CardTitle>
                    <CardDescription className="font-medium">
                      {stats.correct}C • {stats.wrong}W • {stats.unanswered}U of {stats.total}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl font-black">{Number(score).toFixed(2)}%</span>
                      <Badge variant={score >= 70 ? "default" : "destructive"} className="border-2 border-black dark:border-white/65 font-bold">
                        {score >= 70 ? "Good" : "Needs Work"}
                      </Badge>
                    </div>
                    <Progress value={score} className={`[&>div]:${colors.progress}`} />
                  </CardContent>
                </Card>
              )
            })}
        </div>

        {/* Section Performance Chart */}
        {analysis && analysis.sectionPerformance.length > 0 && (
          <Card variant="neobrutalist" className="mb-8">
            <CardHeader>
              <CardTitle className="font-black">Section-wise Performance</CardTitle>
              <CardDescription className="font-medium">Your performance across different sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.sectionPerformance.filter(s => s.score > 0)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="section" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
                    <Legend />
                    <Bar dataKey="score" name="Score %" radius={[4, 4, 0, 0]}>
                      {analysis.sectionPerformance.filter(s => s.score > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time Analysis */}
        {(() => {
          const questionsWithTime = result.questions.filter((q: QuestionResult) => q.timeSpent !== undefined && q.timeSpent > 0)
          if (questionsWithTime.length === 0) return null
          
          const totalTime = questionsWithTime.reduce((sum: number, q: QuestionResult) => sum + (q.timeSpent || 0), 0)
          const avgTime = totalTime / questionsWithTime.length
          const maxTime = Math.max(...questionsWithTime.map((q: QuestionResult) => q.timeSpent || 0))
          const minTime = Math.min(...questionsWithTime.map((q: QuestionResult) => q.timeSpent || 0))
          const maxTimeQuestion = questionsWithTime.find((q: QuestionResult) => q.timeSpent === maxTime)
          
          // Group by section
          const sectionTimes: { [key: string]: { total: number; count: number } } = {}
          questionsWithTime.forEach((q: QuestionResult) => {
            const section = q.section || 'unknown'
            if (!sectionTimes[section]) {
              sectionTimes[section] = { total: 0, count: 0 }
            }
            sectionTimes[section].total += q.timeSpent || 0
            sectionTimes[section].count += 1
          })
          
          return (
            <Card variant="neobrutalist" className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-black">
                  <Timer className="h-5 w-5" />
                  Time Analysis
                </CardTitle>
                <CardDescription className="font-medium">Detailed breakdown of time spent on each question</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Time Stats Overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-100 dark:bg-blue-900/30 border-2 border-black dark:border-white/65 rounded-lg text-center">
                    <div className="text-2xl font-black">{formatTime(totalTime)}</div>
                    <div className="text-xs text-muted-foreground font-medium">Total Time</div>
                  </div>
                  <div className="p-4 bg-green-100 dark:bg-green-900/30 border-2 border-black dark:border-white/65 rounded-lg text-center">
                    <div className="text-2xl font-black">{formatTime(avgTime)}</div>
                    <div className="text-xs text-muted-foreground font-medium">Avg per Question</div>
                  </div>
                  <div className="p-4 bg-cyan-100 dark:bg-cyan-900/30 border-2 border-black dark:border-white/65 rounded-lg text-center">
                    <div className="text-2xl font-black text-blue-600">{formatTime(minTime)}</div>
                    <div className="text-xs text-muted-foreground font-medium">Fastest</div>
                  </div>
                  <div className="p-4 bg-orange-100 dark:bg-orange-900/30 border-2 border-black dark:border-white/65 rounded-lg text-center">
                    <div className="text-2xl font-black text-orange-600">{formatTime(maxTime)}</div>
                    <div className="text-xs text-muted-foreground font-medium">Slowest</div>
                  </div>
                </div>
                
                {/* Time by Section */}
                {Object.keys(sectionTimes).length > 1 && (
                  <div>
                    <h4 className="font-black mb-3">Time by Section</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {Object.entries(sectionTimes).map(([section, data]) => (
                        <div key={section} className="p-3 border-2 border-black dark:border-white/65 rounded-lg">
                          <div className="text-sm font-bold capitalize">{section}</div>
                          <div className="text-lg font-black">{formatTime(data.total / data.count)}</div>
                          <div className="text-xs text-muted-foreground font-medium">avg • {data.count} questions</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Per Question Time Table */}
                <div>
                  <h4 className="font-black mb-3">Time per Question</h4>
                  <div className="overflow-x-auto border-2 border-black dark:border-white/65 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b-2 border-black dark:border-white/65 bg-muted">
                          <th className="text-left py-2 px-3 font-black">Q#</th>
                          <th className="text-left py-2 px-3 font-black">Time</th>
                          <th className="text-left py-2 px-3 font-black">Status</th>
                          <th className="text-left py-2 px-3 font-black hidden sm:table-cell">Section</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.questions.map((q: QuestionResult, idx: number) => {
                          const timeSpent = q.timeSpent || 0
                          const isUnanswered = q.selectedAnswer === -1
                          
                          return (
                            <tr key={idx} className="border-b border-black/20 dark:border-white/65 last:border-0">
                              <td className="py-2 px-3 font-mono font-bold">{idx + 1}</td>
                              <td className="py-2 px-3">
                                <span className="font-bold">
                                  {timeSpent > 0 ? formatTime(timeSpent) : '-'}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                {isUnanswered ? (
                                  <Badge variant="outline" className="text-xs border-2 border-black dark:border-white/65 font-bold">Skipped</Badge>
                                ) : q.isCorrect ? (
                                  <Badge variant="default" className="text-xs bg-green-500 border-2 border-black font-bold">✓ Correct</Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs border-2 border-black font-bold">✗ Wrong</Badge>
                                )}
                              </td>
                              <td className="py-2 px-3 hidden sm:table-cell">
                                <span className="text-xs text-muted-foreground capitalize font-medium">{q.section || '-'}</span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })()}

        {/* Section Filter */}
        <Card variant="neobrutalist" className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <div>
                <CardTitle className="font-black">Question Analysis</CardTitle>
                <CardDescription className="font-medium">Review your answers and see the correct solutions</CardDescription>
              </div>
              <Button onClick={toggleAllQuestions} variant="neobrutalist">
                {(Array.isArray(result.questions) && openQuestions.size === result.questions.length) ? "Collapse All" : "Expand All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                variant={selectedSection === "all" ? "neobrutalistInverted" : "neobrutalist"}
                onClick={() => setSelectedSection("all")}
              >
                All Questions
              </Button>
              {Object.entries(result.sections)
                .filter(([section, score]) => score > 0 && getSectionStats(section).total > 0)
                .map(([section]) => (
                  <Button
                    key={section}
                    variant={selectedSection === section ? "neobrutalistInverted" : "neobrutalist"}
                    onClick={() => setSelectedSection(section)}
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </Button>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Questions Review */}
        <div className="space-y-4">
          {getFilteredQuestions().map((question, index) => {
            const isUnanswered = question.selectedAnswer === -1
            const isWrong = !question.isCorrect && !isUnanswered
            const isOpen = openQuestions.has(index)

            return (
              <Card
                key={index}
                variant="neobrutalist"
                className={`border-l-8 ${
                  question.isCorrect ? "border-l-green-500" : isUnanswered ? "border-l-gray-500" : "border-l-red-500"
                }`}
              >
                <Collapsible open={isOpen} onOpenChange={() => toggleQuestion(index)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {question.isCorrect ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : isUnanswered ? (
                            <Minus className="h-5 w-5 text-gray-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <div>
                            <CardTitle className="text-lg flex flex-wrap items-center gap-2 font-black">
                              Question {index + 1}
                              <Badge variant="outline" className="ml-2 whitespace-nowrap border-2 border-black dark:border-white/65 font-bold">
                                {question.section}
                              </Badge>
                              {question.timeSpent !== undefined && question.timeSpent > 0 && (
                                <Badge variant="secondary" className="ml-2 whitespace-nowrap text-xs px-2 py-1 border-2 border-black dark:border-white/65 font-bold">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {formatTime(question.timeSpent)}
                                </Badge>
                              )}
                              {isWrong && result.negativeMarking && (
                                <Badge variant="destructive" className="ml-2 whitespace-nowrap text-xs px-2 py-1 border-2 border-black font-bold">
                                  -{result.negativeMarkValue} marks
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1 line-clamp-2 font-medium">
                              <MathRenderer text={question.question} />
                            </CardDescription>
                          </div>
                        </div>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="font-bold">
                          <MathRenderer text={question.question} />
                        </p>

                        {/* Question Image */}
                        {question.image && (
                          <div className="mb-4">
                            <img
                              src={question.image || "/placeholder.svg"}
                              alt="Question illustration"
                              className="max-w-sm rounded border-2 border-black dark:border-white/65"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          {(question.options || []).map((option, optionIndex) => {
                            const isSelected = optionIndex === question.selectedAnswer
                            const isCorrect = optionIndex === question.correctAnswer

                            return (
                              <div
                                key={optionIndex}
                                className={`p-3 rounded-lg border-2 ${
                                  isCorrect
                                    ? "bg-green-100 border-green-600 dark:bg-green-900/30 dark:border-green-500"
                                    : isSelected && !isCorrect
                                      ? "bg-red-100 border-red-600 dark:bg-red-900/30 dark:border-red-500"
                                      : "bg-muted border-black dark:border-white/65"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-medium">
                                    <MathRenderer text={option} />
                                  </span>
                                  <div className="flex gap-2">
                                    {isSelected && (
                                      <Badge variant={isCorrect ? "default" : "destructive"} className="border-2 border-black font-bold">Your Answer</Badge>
                                    )}
                                    {isCorrect && (
                                      <Badge variant="default" className="bg-green-600 border-2 border-black font-bold">
                                        Correct
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Show explanation if available */}
                        {question.explanation !== undefined && question.explanation !== null && (
                          <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-600 dark:border-blue-500 rounded-lg">
                            <p className="text-sm font-medium">
                              <strong className="font-black">Explanation:</strong>
                            </p>
                            <div className="mt-2 text-sm">
                              {formatExplanation(question.explanation)}
                            </div>
                          </div>
                        )}

                        {/* Show unanswered message */}
                        {isUnanswered && (
                          <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-900/30 border-2 border-gray-600 dark:border-gray-500 rounded-lg">
                            <p className="text-sm text-muted-foreground font-medium">
                              <strong className="font-black">Not Attempted:</strong> This question was left unanswered.
                            </p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
