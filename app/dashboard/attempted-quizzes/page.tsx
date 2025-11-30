"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, History, Eye, TrendingUp, BookOpen, Target, Clock, CheckCircle2, XCircle, MinusCircle } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { cn } from "@/lib/utils"

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
      <div className="min-h-screen bg-background flex items-center justify-center pt-16 md:pt-0">
        <div className="text-center">Loading attempted quizzes...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-0">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Attempted Quizzes</h1>
              <p className="text-sm text-muted-foreground">Review your quiz history and performance</p>
            </div>
          </div>
          <Link href="/history">
            <Button variant="outline" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              Full History
            </Button>
          </Link>
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-card border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Attempts</p>
                    <p className="text-xl font-bold">{allAttempts.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-card border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Average Score</p>
                    <p className="text-xl font-bold">
                      {Math.round(allAttempts.reduce((sum, a) => sum + a.totalScore, 0) / allAttempts.length)}%
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-card border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Target className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Best Score</p>
                    <p className="text-xl font-bold">
                      {Math.max(...allAttempts.map(a => a.totalScore))}%
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-card border">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10">
                    <Clock className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg Time</p>
                    <p className="text-xl font-bold">
                      {Math.round(allAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / allAttempts.length / 60)}m
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* All Attempts List */}
            <div>
              <h2 className="text-lg font-semibold mb-4">All Attempts</h2>
              <div className="space-y-3">
                {allAttempts.map((attempt) => {
                  const scoreColor = attempt.totalScore >= 80 ? 'text-green-500' : 
                                     attempt.totalScore >= 60 ? 'text-yellow-500' : 'text-red-500'
                  const scoreBg = attempt.totalScore >= 80 ? 'bg-green-500/10' : 
                                  attempt.totalScore >= 60 ? 'bg-yellow-500/10' : 'bg-red-500/10'
                  
                  return (
                    <div 
                      key={attempt._id} 
                      className="group p-4 rounded-xl bg-card border hover:border-primary/30 hover:shadow-sm transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Score & Info */}
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          {/* Score Circle */}
                          <div className={cn(
                            "w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0",
                            scoreBg
                          )}>
                            <span className={cn("text-lg font-bold", scoreColor)}>
                              {Math.round(attempt.totalScore)}
                            </span>
                            <span className={cn("text-[10px] font-medium", scoreColor)}>%</span>
                          </div>
                          
                          {/* Quiz Details */}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold truncate">
                              {attempt.quizName || 'Unknown Quiz'}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(attempt.date).toLocaleDateString('en-US', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                              {attempt.timeSpent && ` • ${Math.round(attempt.timeSpent / 60)} min`}
                            </p>
                            
                            {/* Stats Row */}
                            <div className="flex items-center gap-3 mt-2 text-xs">
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCircle2 className="h-3 w-3" />
                                {attempt.correctAnswers}
                              </span>
                              <span className="flex items-center gap-1 text-red-500">
                                <XCircle className="h-3 w-3" />
                                {attempt.wrongAnswers}
                              </span>
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MinusCircle className="h-3 w-3" />
                                {attempt.unanswered}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Right: Action */}
                        <div className="shrink-0">
                          {attempt.quizId && (
                            <Link href={`/results/${attempt._id}`}>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="gap-2 opacity-60 group-hover:opacity-100 transition-opacity"
                              >
                                <Eye className="h-4 w-4" />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
