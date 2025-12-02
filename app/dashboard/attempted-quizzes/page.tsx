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
      <div className="min-h-screen bg-background flex items-center justify-center mobile-header-safe-zone">
        <div className="text-center">Loading attempted quizzes...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background mobile-header-safe-zone">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="outline" size="icon" className="rounded-lg h-11 w-11 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#fff] bg-white dark:bg-zinc-900 transition-all">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black">Attempted Quizzes</h1>
              <p className="text-sm text-muted-foreground font-medium">Review your quiz history and performance</p>
            </div>
          </div>
          <Link href="/history">
            <Button variant="neobrutalist" size="sm" className="gap-2">
              <History className="h-4 w-4" />
              Full History
            </Button>
          </Link>
        </div>

        {loadingAttempts ? (
          <Card variant="neobrutalist">
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground font-medium">Loading attempted quizzes...</p>
            </CardContent>
          </Card>
        ) : allAttempts.length === 0 ? (
          <Card variant="neobrutalist">
            <CardContent className="text-center py-12">
              <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4 font-medium">No quizzes attempted yet</p>
              <p className="text-sm text-muted-foreground mb-6 font-medium">Start taking quizzes to track your progress here</p>
              <Link href="/dashboard">
                <Button variant="neobrutalist">Browse Available Quizzes</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-card border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-400 border-2 border-black">
                    <BookOpen className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Total Attempts</p>
                    <p className="text-xl font-black">{allAttempts.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-card border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-400 border-2 border-black">
                    <TrendingUp className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Average Score</p>
                    <p className="text-xl font-black">
                      {(allAttempts.reduce((sum, a) => sum + (a.rawScore ?? (a.correctAnswers - a.wrongAnswers * 0.25)), 0) / allAttempts.length).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-card border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-400 border-2 border-black">
                    <Target className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Best Score</p>
                    <p className="text-xl font-black">
                      {Math.max(...allAttempts.map(a => a.rawScore ?? (a.correctAnswers - a.wrongAnswers * 0.25))).toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-card border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-400 border-2 border-black">
                    <Clock className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Avg Time</p>
                    <p className="text-xl font-black">
                      {Math.round(allAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / allAttempts.length / 60)}m
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* All Attempts List */}
            <div>
              <h2 className="text-lg font-black mb-4">All Attempts</h2>
              <div className="space-y-3">
                {allAttempts.map((attempt) => {
                  const scoreColor = attempt.totalScore >= 80 ? 'text-green-600' : 
                                     attempt.totalScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  const scoreBg = attempt.totalScore >= 80 ? 'bg-green-400' : 
                                  attempt.totalScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'
                  
                  // Calculate actual marks from rawScore or estimate from correct/wrong
                  const actualMarks = attempt.rawScore ?? (attempt.correctAnswers - (attempt.wrongAnswers * 0.25))
                  const totalQuestions = attempt.correctAnswers + attempt.wrongAnswers + attempt.unanswered
                  const maxMarks = totalQuestions // Assuming 1 mark per question
                  
                  return (
                    <div 
                      key={attempt._id} 
                      className="group p-4 rounded-xl bg-card border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#fff] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#fff] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Score & Info */}
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          {/* Score Circle */}
                          <div className={cn(
                            "w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 border-2 border-black",
                            scoreBg
                          )}>
                            <span className={cn("text-lg font-black", scoreColor)}>
                              {actualMarks.toFixed(1)}
                            </span>
                            <span className={cn("text-[10px] font-bold", scoreColor)}>/{maxMarks}</span>
                          </div>
                          
                          {/* Quiz Details */}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold truncate">
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
                                variant="neobrutalist" 
                                size="sm" 
                                className="gap-2"
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
