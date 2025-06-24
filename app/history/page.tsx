"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, TrendingUp, Eye } from "lucide-react"

interface HistoryAttempt {
  _id: string
  date: string
  totalScore: number
  sections: {
    reasoning: number
    quantitative: number
    english: number
  }
}

export default function HistoryPage() {
  const [attempts, setAttempts] = useState<HistoryAttempt[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load history from localStorage
    const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
    setAttempts(results.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()))
    setLoading(false)
  }, [])

  const getScoreTrend = (index: number) => {
    if (index === attempts.length - 1) return null
    const current = attempts[index].totalScore
    const previous = attempts[index + 1].totalScore
    return current - previous
  }

  const getAverageScore = () => {
    if (attempts.length === 0) return 0
    const total = attempts.reduce((sum, attempt) => sum + attempt.totalScore, 0)
    return Math.round(total / attempts.length)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading history...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quiz History</h1>
            <p className="text-gray-600">Track your progress over time</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Total Attempts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{attempts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Average Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{getAverageScore()}%</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Best Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {attempts.length > 0 ? Math.max(...attempts.map((a) => a.totalScore)) : 0}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        <Card>
          <CardHeader>
            <CardTitle>All Attempts</CardTitle>
            <CardDescription>Click on any attempt to view detailed results</CardDescription>
          </CardHeader>
          <CardContent>
            {attempts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No quiz attempts yet</p>
                <Link href="/quiz">
                  <Button>Take Your First Quiz</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {attempts.map((attempt, index) => {
                  const trend = getScoreTrend(index)

                  return (
                    <div
                      key={attempt._id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-medium">
                            {new Date(attempt.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-gray-600">
                            {new Date(attempt.date).toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-lg px-3 py-1">
                            {attempt.totalScore}%
                          </Badge>
                          {trend !== null && (
                            <Badge variant={trend >= 0 ? "default" : "destructive"} className="text-xs">
                              {trend >= 0 ? "+" : ""}
                              {trend}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="text-xs">
                            R: {attempt.sections.reasoning}%
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            Q: {attempt.sections.quantitative}%
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            E: {attempt.sections.english}%
                          </Badge>
                        </div>

                        <Link href={`/results/${attempt._id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </Link>
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
