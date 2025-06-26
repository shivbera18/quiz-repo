"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, History, Eye, TrendingUp, BookOpen, Target, Clock } from "lucide-react"
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

export default function AttemptedQuizzesPage() {
  const { user, loading } = useAuth()
  const [allAttempts, setAllAttempts] = useState<RecentAttempt[]>([])
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
            setAllAttempts(sortedAttempts)
          } else {
            const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
            const sortedResults = results
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            setAllAttempts(sortedResults)
          }
        } catch (error) {
          console.error("Failed to fetch attempts:", error)
          const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
          const sortedResults = results
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          setAllAttempts(sortedResults)
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
        <div className="text-center">Loading attempted quizzes...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 relative">
        {/* Theme Toggle Top Right */}
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-2 mb-8">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Link href="/dashboard">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Attempted Quizzes</h1>
              <p className="text-muted-foreground">Review all your quiz attempts and performance</p>
            </div>
          </div>
          <div className="flex flex-col xs:flex-row gap-2 w-full sm:w-auto">
            <Link href="/history" className="w-full xs:w-auto">
              <Button variant="outline" className="w-full xs:w-auto">
                <History className="h-4 w-4 mr-2" />
                Full History
              </Button>
            </Link>
          </div>
        </div>

        {loadingAttempts ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Loading attempted quizzes...</p>
            </CardContent>
          </Card>
        ) : allAttempts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No quizzes attempted yet</p>
              <p className="text-sm text-muted-foreground mb-6">Start taking quizzes to track your progress here</p>
              <Link href="/dashboard">
                <Button>Browse Available Quizzes</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Attempts</p>
                      <p className="text-2xl font-bold text-blue-700">{allAttempts.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-green-600 font-medium">Average Score</p>
                      <p className="text-2xl font-bold text-green-700">
                        {Math.round(allAttempts.reduce((sum, a) => sum + a.totalScore, 0) / allAttempts.length)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Best Score</p>
                      <p className="text-2xl font-bold text-purple-700">
                        {Math.max(...allAttempts.map(a => a.totalScore))}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Avg Time</p>
                      <p className="text-2xl font-bold text-orange-700">
                        {Math.round(allAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / allAttempts.length / 60)}m
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* All Attempts List */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">All Quiz Attempts</CardTitle>
                <CardDescription>Complete history of your quiz performances</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 overflow-x-auto">
                  {allAttempts.map((attempt, index) => (
                    <div key={attempt._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 sm:p-4 border rounded-lg hover:bg-muted/50 transition-colors min-w-[320px] max-w-full overflow-x-auto">
                      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 aspect-square rounded-full flex items-center justify-center font-bold text-white text-base sm:text-xl flex-shrink-0 shadow-md"
                          style={{ backgroundColor: attempt.totalScore >= 80 ? '#22c55e' : attempt.totalScore >= 60 ? '#eab308' : '#ef4444' }}>
                          {attempt.totalScore}%
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold truncate max-w-[120px] xs:max-w-[160px] sm:max-w-xs">{attempt.quizName || 'Unknown Quiz'}</h4>
                          <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-muted-foreground">
                            <span>{new Date(attempt.date).toLocaleDateString()}</span>
                            <span>✓ {attempt.correctAnswers} correct</span>
                            <span>✗ {attempt.wrongAnswers} wrong</span>
                            <span>— {attempt.unanswered} unanswered</span>
                            {attempt.timeSpent && (
                              <span>⏱ {Math.round(attempt.timeSpent / 60)}m</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap px-2 py-1">
                              R: {attempt.sections.reasoning}%
                            </Badge>
                            <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap px-2 py-1">
                              Q: {attempt.sections.quantitative}%
                            </Badge>
                            <Badge variant="outline" className="text-[10px] sm:text-xs whitespace-nowrap px-2 py-1">
                              E: {attempt.sections.english}%
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap sm:flex-nowrap items-center gap-1 sm:gap-2 mt-2 sm:mt-0 flex-shrink-0">
                        <Badge variant={
                          attempt.totalScore >= 80 ? 'default' :
                          attempt.totalScore >= 60 ? 'secondary' : 'destructive'
                        } className="text-xs px-2 py-1 whitespace-nowrap">
                          {attempt.totalScore >= 80 ? 'Excellent' :
                            attempt.totalScore >= 60 ? 'Good' : ''}
                        </Badge>
                        {attempt.quizId && (
                          <Link href={`/results/${attempt._id}`} className="w-full sm:w-auto">
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
