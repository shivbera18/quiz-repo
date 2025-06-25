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
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts"
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
}

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

  useEffect(() => {
    if (authLoading) return
    
    const loadResult = async () => {
      try {
        // First try to fetch from API
        if (user?.token) {
          const response = await fetch(`/api/results/${params.id}`, {
            headers: {
              Authorization: `Bearer ${user.token}`,
              "Cache-Control": "no-cache, no-store, must-revalidate",
            },
          })

          if (response.ok) {
            const data = await response.json()
            if (data.result) {
              setResult(data.result)
              setLoading(false)
              return
            }
          }
        }

        // Fallback to localStorage
        const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
        const foundResult = results.find((r: Result) => r._id === params.id)

        if (foundResult) {
          setResult(foundResult)
        } else {
          setError("Result not found. It may have been deleted or the link is invalid.")
        }
      } catch (error) {
        console.error("Error loading result:", error)
        setError("Failed to load quiz result. Please try again.")
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
    if (!result) return

    if (openQuestions.size === result.questions.length) {
      setOpenQuestions(new Set())
    } else {
      setOpenQuestions(new Set(Array.from({ length: result.questions.length }, (_, i) => i)))
    }
  }

  const getFilteredQuestions = () => {
    if (!result) return []
    if (selectedSection === "all") return result.questions
    return result.questions.filter((q) => q.section === selectedSection)
  }

  const getSectionStats = (section: string) => {
    if (!result) return { correct: 0, total: 0, wrong: 0, unanswered: 0 }
    const sectionQuestions = result.questions.filter((q) => q.section === section)
    const correct = sectionQuestions.filter((q) => q.isCorrect).length
    const wrong = sectionQuestions.filter((q) => !q.isCorrect && q.selectedAnswer !== -1).length
    const unanswered = sectionQuestions.filter((q) => q.selectedAnswer === -1).length
    return { correct, total: sectionQuestions.length, wrong, unanswered }
  }

  const getPerformanceAnalysis = () => {
    if (!result) return null

    const totalQuestions = result.questions.length
    const correct = result.correctAnswers || result.questions.filter((q) => q.isCorrect).length
    const wrong = result.wrongAnswers || result.questions.filter((q) => !q.isCorrect && q.selectedAnswer !== -1).length
    const unanswered = result.unanswered || result.questions.filter((q) => q.selectedAnswer === -1).length

    // Performance by difficulty (based on section performance)
    const sectionPerformance = [
      { section: "Reasoning", score: result.sections.reasoning, color: "#8884d8" },
      { section: "Quantitative", score: result.sections.quantitative, color: "#82ca9d" },
      { section: "English", score: result.sections.english, color: "#ffc658" },
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading results...</div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
          <p className="text-muted-foreground mb-4">
            {error || "Result not found"}
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            This could happen if the result was not properly saved or the link is invalid.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
            <Link href="/history">
              <Button variant="outline">View History</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const analysis = getPerformanceAnalysis()

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Quiz Results</h1>
            <p className="text-muted-foreground">
              {result.quizName} • Completed on {new Date(result.date).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/quiz/${result.quizId}`}>
              <Button variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Retake Quiz
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button>
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Negative Marking Info */}
        {result.negativeMarking && (
          <Alert className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              This quiz had negative marking of -{result.negativeMarkValue} marks per wrong answer.
            </AlertDescription>
          </Alert>
        )}

        {/* Score Overview */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="md:col-span-2 lg:col-span-1">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-bold text-blue-600">{result.totalScore}%</CardTitle>
              <CardDescription>Final Score</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {result.rawScore !== undefined && (
                <div className="space-y-1 text-sm">
                  <p>Raw Score: {result.rawScore.toFixed(2)}</p>
                  {result.negativeMarking && result.negativeMarks && result.negativeMarks > 0 && (
                    <p className="text-red-600">Penalty: -{result.negativeMarks}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Correct
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {result.correctAnswers || result.questions.filter((q) => q.isCorrect).length}
              </div>
              <p className="text-sm text-muted-foreground">
                +{result.positiveMarks || result.questions.filter((q) => q.isCorrect).length} marks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                Wrong
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {result.wrongAnswers || result.questions.filter((q) => !q.isCorrect && q.selectedAnswer !== -1).length}
              </div>
              {result.negativeMarking && (
                <p className="text-sm text-muted-foreground">-{result.negativeMarks || 0} marks</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Minus className="h-5 w-5 text-gray-600" />
                Unanswered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-600">
                {result.unanswered || result.questions.filter((q) => q.selectedAnswer === -1).length}
              </div>
              <p className="text-sm text-muted-foreground">No penalty</p>
            </CardContent>
          </Card>
        </div>

        {/* Advanced Analysis */}
        {analysis && (
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Performance Insights */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Performance Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analysis.accuracy}%</div>
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analysis.attemptRate}%</div>
                    <p className="text-sm text-muted-foreground">Attempt Rate</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analysis.timePerQuestion}s</div>
                    <p className="text-sm text-muted-foreground">Per Question</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{analysis.timeEfficiency}</div>
                    <p className="text-sm text-muted-foreground">Efficiency</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {analysis.insights.map((insight, index) => (
                    <Alert key={index} variant={insight.type === "error" ? "destructive" : "default"}>
                      <AlertDescription>{insight.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Answer Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Answer Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analysis.answerDistribution}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
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
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {["reasoning", "quantitative", "english"].map((section) => {
            const stats = getSectionStats(section)
            const sectionScore = result.sections[section as keyof typeof result.sections]

            return (
              <Card key={section}>
                <CardHeader>
                  <CardTitle className="text-lg capitalize">{section}</CardTitle>
                  <CardDescription>
                    {stats.correct}C • {stats.wrong}W • {stats.unanswered}U of {stats.total}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold">{sectionScore}%</span>
                    <Badge variant={sectionScore >= 70 ? "default" : "destructive"}>
                      {sectionScore >= 70 ? "Good" : "Needs Work"}
                    </Badge>
                  </div>
                  <Progress value={sectionScore} />
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Section Performance Chart */}
        {analysis && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Section-wise Performance</CardTitle>
              <CardDescription>Your performance across different sections</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analysis.sectionPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="section" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, "Score"]} />
                    <Bar dataKey="score" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section Filter */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Question Analysis</CardTitle>
                <CardDescription>Review your answers and see the correct solutions</CardDescription>
              </div>
              <Button onClick={toggleAllQuestions} variant="outline">
                {openQuestions.size === result.questions.length ? "Collapse All" : "Expand All"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button
                variant={selectedSection === "all" ? "default" : "outline"}
                onClick={() => setSelectedSection("all")}
              >
                All Questions
              </Button>
              <Button
                variant={selectedSection === "reasoning" ? "default" : "outline"}
                onClick={() => setSelectedSection("reasoning")}
              >
                Reasoning
              </Button>
              <Button
                variant={selectedSection === "quantitative" ? "default" : "outline"}
                onClick={() => setSelectedSection("quantitative")}
              >
                Quantitative
              </Button>
              <Button
                variant={selectedSection === "english" ? "default" : "outline"}
                onClick={() => setSelectedSection("english")}
              >
                English
              </Button>
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
                className={`border-l-4 ${
                  question.isCorrect ? "border-l-green-500" : isUnanswered ? "border-l-gray-500" : "border-l-red-500"
                }`}
              >
                <Collapsible open={isOpen} onOpenChange={() => toggleQuestion(index)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-muted/50">
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
                            <CardTitle className="text-lg flex items-center gap-2">
                              Question {index + 1}
                              <Badge variant="outline" className="ml-2">
                                {question.section}
                              </Badge>
                              {isWrong && result.negativeMarking && (
                                <Badge variant="destructive" className="ml-2">
                                  -{result.negativeMarkValue} marks
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-1 line-clamp-2">{question.question}</CardDescription>
                          </div>
                        </div>
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent>
                      <div className="space-y-4">
                        <p className="font-medium">{question.question}</p>

                        {/* Question Image */}
                        {question.image && (
                          <div className="mb-4">
                            <img
                              src={question.image || "/placeholder.svg"}
                              alt="Question illustration"
                              className="max-w-sm rounded border"
                            />
                          </div>
                        )}

                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => {
                            const isSelected = optionIndex === question.selectedAnswer
                            const isCorrect = optionIndex === question.correctAnswer

                            return (
                              <div
                                key={optionIndex}
                                className={`p-3 rounded-lg border ${
                                  isCorrect
                                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                                    : isSelected && !isCorrect
                                      ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                                      : "bg-muted"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{option}</span>
                                  <div className="flex gap-2">
                                    {isSelected && (
                                      <Badge variant={isCorrect ? "default" : "destructive"}>Your Answer</Badge>
                                    )}
                                    {isCorrect && (
                                      <Badge variant="default" className="bg-green-600">
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
                        {question.explanation && (
                          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <p className="text-sm">
                              <strong>Explanation:</strong> {question.explanation}
                            </p>
                          </div>
                        )}

                        {/* Show unanswered message */}
                        {isUnanswered && (
                          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              <strong>Not Attempted:</strong> This question was left unanswered.
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
