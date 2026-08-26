"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { History, Eye, TrendingUp, BookOpen, Target, Clock, CheckCircle2, XCircle, MinusCircle, RotateCcw } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { fetchAttemptHistory, type AttemptHistoryItem } from "@/lib/attempt-history"
import { fmtPct } from "@/lib/format"
import { cn } from "@/lib/utils"
import { MobilePageHeader } from "@/components/layout/mobile-page-header"

export default function AttemptedQuizzesPage() {
  const { user, loading } = useAuth()
  const [allAttempts, setAllAttempts] = useState<AttemptHistoryItem[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)

  useEffect(() => {
    if (!loading && user) {
      const fetchAttempts = async () => {
        try {
          const enriched = await fetchAttemptHistory(user.token || "student-token-placeholder", {
            status: "SUBMITTED",
            limit: 100,
          })
          setAllAttempts(enriched)
        } catch (error) {
          console.error("Failed to fetch attempts:", error)
          setAllAttempts([])
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

  const historyButton = (
    <Link href="/history">
      <Button variant="neobrutalist" className="border-4 border-black dark:border-white/65">
        <History className="h-5 w-5" />
        <span className="ml-2">Full History</span>
      </Button>
    </Link>
  )

  const mobileHistoryButton = (
    <Link href="/history">
      <Button 
        variant="outline" 
        size="icon"
        className="h-10 w-10 shrink-0 rounded-lg border-4 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.75)] bg-green-300 dark:bg-green-400 hover:bg-green-400 dark:hover:bg-green-500 transition-all"
      >
        <History className="h-5 w-5" />
      </Button>
    </Link>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 pt-4 pb-4 md:py-8">
        {/* Mobile & Desktop Header with History action */}
        <MobilePageHeader 
          title="Attempted Quizzes" 
          subtitle="Review your quiz history and performance"
          backHref="/dashboard"
          action={historyButton}
          mobileAction={mobileHistoryButton}
        />

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
              <div className="p-4 rounded-xl bg-card border-2 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)]">
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
              
              <div className="p-4 rounded-xl bg-card border-2 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-400 border-2 border-black">
                    <TrendingUp className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Average Score</p>
                    <p className="text-xl font-black">
                      {fmtPct(allAttempts.reduce((sum, a) => sum + a.totalScore, 0) / allAttempts.length)}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-card border-2 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)]">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-400 border-2 border-black">
                    <Target className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-bold">Best Score</p>
                    <p className="text-xl font-black">
                      {fmtPct(Math.max(...allAttempts.map(a => a.totalScore)))}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-xl bg-card border-2 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)]">
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
                  const scoreBg = attempt.totalScore >= 80 ? 'bg-green-400' : 
                                  attempt.totalScore >= 60 ? 'bg-yellow-400' : 'bg-orange-400'
                  
                  return (
                    <div 
                      key={attempt._id} 
                      className="group p-4 rounded-xl bg-card border-2 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.75)] transition-all"
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Score & Info */}
                        <div className="flex items-start gap-4 min-w-0 flex-1">
                          {/* Score Circle */}
                          <div className={cn(
                            "w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border-2 border-black",
                            scoreBg
                          )}>
                            <span className="text-base font-black text-black">
                              {Math.round(attempt.totalScore)}%
                            </span>
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
                        <div className="shrink-0 flex flex-col gap-2">
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
                          {attempt.quizId && attempt.quizNameKnown && (
                            <Link href={`/quiz/${attempt.quizId}`}>
                              <Button variant="outline" size="sm" className="gap-2 font-bold">
                                <RotateCcw className="h-4 w-4" />
                                <span className="hidden sm:inline">Retake</span>
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
