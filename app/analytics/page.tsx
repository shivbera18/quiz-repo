"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, TrendingUp, Target, Clock, Award } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface QuizResult {
  _id: string
  date: string
  quizName: string
  totalScore: number
  sections: {
    reasoning: number
    quantitative: number
    english: number
  }
  timeSpent?: number
  difficulty?: string
}

export default function AnalyticsPage() {
  const [results, setResults] = useState<QuizResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load results from localStorage
    const quizResults = JSON.parse(localStorage.getItem("quizResults") || "[]")
    setResults(quizResults.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    setLoading(false)
  }, [])

  const getScoreProgressData = () => {
    return results.map((result, index) => ({
      attempt: index + 1,
      score: result.totalScore,
      date: new Date(result.date).toLocaleDateString(),
      quizName: result.quizName,
    }))
  }

  const getSectionPerformanceData = () => {
    if (results.length === 0) return []

    const sectionTotals = { reasoning: 0, quantitative: 0, english: 0 }
    const sectionCounts = { reasoning: 0, quantitative: 0, english: 0 }

    results.forEach((result) => {
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
        color: "#8884d8",
      },
      {
        section: "Quantitative",
        average:
          sectionCounts.quantitative > 0 ? Math.round(sectionTotals.quantitative / sectionCounts.quantitative) : 0,
        color: "#82ca9d",
      },
      {
        section: "English",
        average: sectionCounts.english > 0 ? Math.round(sectionTotals.english / sectionCounts.english) : 0,
        color: "#ffc658",
      },
    ]
  }

  const getDifficultyDistribution = () => {
    const distribution = results.reduce(
      (acc, result) => {
        const difficulty = result.difficulty || "mixed"
        acc[difficulty] = (acc[difficulty] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return Object.entries(distribution).map(([difficulty, count]) => ({
      difficulty: difficulty.charAt(0).toUpperCase() + difficulty.slice(1),
      count,
      color:
        difficulty === "easy"
          ? "#4ade80"
          : difficulty === "medium"
            ? "#fbbf24"
            : difficulty === "hard"
              ? "#ef4444"
              : "#8b5cf6",
    }))
  }

  const getStats = () => {
    if (results.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        bestScore: 0,
        improvement: 0,
        totalTimeSpent: 0,
      }
    }

    const totalScore = results.reduce((sum, result) => sum + result.totalScore, 0)
    const averageScore = Math.round(totalScore / results.length)
    const bestScore = Math.max(...results.map((r) => r.totalScore))

    // Calculate improvement (last 3 vs first 3 attempts)
    let improvement = 0
    if (results.length >= 6) {
      const firstThree = results.slice(0, 3).reduce((sum, r) => sum + r.totalScore, 0) / 3
      const lastThree = results.slice(-3).reduce((sum, r) => sum + r.totalScore, 0) / 3
      improvement = Math.round(lastThree - firstThree)
    }

    const totalTimeSpent = results.reduce((sum, result) => sum + (result.timeSpent || 0), 0)

    return {
      totalAttempts: results.length,
      averageScore,
      bestScore,
      improvement,
      totalTimeSpent: Math.round(totalTimeSpent / 60), // Convert to minutes
    }
  }

  const stats = getStats()
  const scoreProgressData = getScoreProgressData()
  const sectionPerformanceData = getSectionPerformanceData()
  const difficultyDistribution = getDifficultyDistribution()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Performance Analytics</h1>
              <p className="text-muted-foreground">Detailed insights into your quiz performance</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {results.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground mb-4">No quiz data available yet</p>
              <Link href="/quiz/create">
                <Button>Take Your First Quiz</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
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
                  <CardTitle className="text-sm font-medium">Best Score</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.bestScore}%</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Improvement</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.improvement > 0 ? "+" : ""}
                    {stats.improvement}%
                  </div>
                  <Badge variant={stats.improvement >= 0 ? "default" : "destructive"} className="text-xs">
                    {stats.improvement >= 0 ? "Improving" : "Needs Focus"}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Time Spent</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalTimeSpent}m</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              {/* Score Progress Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Score Progress Over Time</CardTitle>
                  <CardDescription>Track your improvement across all quiz attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scoreProgressData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="attempt" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip
                          formatter={(value, name) => [`${value}%`, "Score"]}
                          labelFormatter={(label) => `Attempt ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="score"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Section Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Average Section Performance</CardTitle>
                  <CardDescription>Your average scores across different sections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={sectionPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="section" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, "Average Score"]} />
                        <Bar dataKey="average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Additional Charts */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Difficulty Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Quiz Difficulty Distribution</CardTitle>
                  <CardDescription>Breakdown of quiz difficulties attempted</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={difficultyDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="count"
                          label={({ difficulty, count }) => `${difficulty}: ${count}`}
                        >
                          {difficultyDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Quiz Performance</CardTitle>
                  <CardDescription>Your last 5 quiz attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results
                      .slice(-5)
                      .reverse()
                      .map((result, index) => (
                        <div key={result._id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div>
                            <p className="font-medium">{result.quizName}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(result.date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={result.totalScore >= 70 ? "default" : "destructive"}>
                              {result.totalScore}%
                            </Badge>
                            {result.difficulty && (
                              <Badge variant="outline" className="text-xs">
                                {result.difficulty}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
