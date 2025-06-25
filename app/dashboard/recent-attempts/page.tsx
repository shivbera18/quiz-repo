"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Clock, Eye, TrendingUp } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface RecentAttempt {
  _id: string
  date: string
  totalScore: number
  quizName: string
  quizId: string
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

export default function RecentAttemptsPage() {
  const { user, loading } = useAuth()
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)

  useEffect(() => {
    if (!loading && user) {
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
            const sortedAttempts = attempts.sort((a: any, b: any) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            )
            setRecentAttempts(sortedAttempts.slice(0, 10)) // Show last 10 attempts
          } else {
            const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
            const sortedResults = results
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            setRecentAttempts(sortedResults.slice(0, 10))
          }
        } catch (error) {
          console.error("Failed to fetch attempts:", error)
          const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
          const sortedResults = results
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          setRecentAttempts(sortedResults.slice(0, 10))
        } finally {
          setLoadingAttempts(false)
        }
      }
      fetchAttempts()
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading recent attempts...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Recent Attempts</h1>
              <p className="text-muted-foreground">Your latest quiz performances and results</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/attempted-quizzes">
              <Button variant="outline">
                View All Attempts
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {loadingAttempts ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Loading recent attempts...</p>
            </CardContent>
          </Card>
        ) : recentAttempts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No recent attempts yet</p>
              <p className="text-sm text-muted-foreground mb-6">Start taking quizzes to see your results here</p>
              <Link href="/dashboard">
                <Button>Browse Available Quizzes</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Performance Trend */}
            {recentAttempts.length > 1 && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Performance Trend
                  </CardTitle>
                  <CardDescription>Your progress over recent attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average of last 5 attempts</p>
                      <p className="text-2xl font-bold text-blue-700">
                        {Math.round(recentAttempts.slice(0, 5).reduce((sum, a) => sum + a.totalScore, 0) / Math.min(5, recentAttempts.length))}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Best recent score</p>
                      <p className="text-2xl font-bold text-green-700">
                        {Math.max(...recentAttempts.slice(0, 5).map(a => a.totalScore))}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total recent attempts</p>
                      <p className="text-2xl font-bold text-purple-700">{recentAttempts.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Attempts List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Quiz Attempts</CardTitle>
                <CardDescription>Your latest quiz performances (last 10 attempts)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recentAttempts.map((attempt, index) => (
                    <div key={attempt._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                            attempt.totalScore >= 80 ? 'bg-green-500' :
                            attempt.totalScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}>
                            {attempt.totalScore}%
                          </div>
                          <span className="text-xs text-muted-foreground mt-1">#{index + 1}</span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{attempt.quizName || 'Unknown Quiz'}</h4>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{new Date(attempt.date).toLocaleDateString()}</span>
                            <span>✓ {attempt.correctAnswers} correct</span>
                            <span>✗ {attempt.wrongAnswers} wrong</span>
                            <span>— {attempt.unanswered} unanswered</span>
                            {attempt.timeSpent && (
                              <span>⏱ {Math.round(attempt.timeSpent / 60)}m</span>
                            )}
                          </div>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">Reasoning: {attempt.sections.reasoning}%</Badge>
                            <Badge variant="outline" className="text-xs">Quantitative: {attempt.sections.quantitative}%</Badge>
                            <Badge variant="outline" className="text-xs">English: {attempt.sections.english}%</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          attempt.totalScore >= 80 ? 'default' :
                          attempt.totalScore >= 60 ? 'secondary' : 'destructive'
                        }>
                          {attempt.totalScore >= 80 ? 'Excellent' :
                           attempt.totalScore >= 60 ? 'Good' : 'Needs Improvement'}
                        </Badge>
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
                  ))}
                </div>
                
                {recentAttempts.length >= 10 && (
                  <div className="mt-4 text-center">
                    <Link href="/dashboard/attempted-quizzes">
                      <Button variant="outline">
                        View All Attempts
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
