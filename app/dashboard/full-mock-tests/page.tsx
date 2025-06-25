"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, BookOpen, Clock } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface Quiz {
  id: string
  title: string
  description: string
  duration: number
  sections: string[]
  questions: any[]
  isActive: boolean
}

export default function FullMockTestsPage() {
  const { user, loading } = useAuth()
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([])
  const [attemptedQuizzes, setAttemptedQuizzes] = useState<any[]>([])

  useEffect(() => {
    if (!loading && user) {
      // Fetch attempted quizzes first
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
            setAttemptedQuizzes(data.results || [])
          }
        } catch (error) {
          console.error("Failed to fetch attempts:", error)
        }
      }

      // Fetch available quizzes
      fetch("/api/quizzes", {
        headers: {
          Authorization: `Bearer ${user.token || "student-token-placeholder"}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to fetch quizzes")
          return res.json()
        })
        .then((data) => {
          const activeQuizzes = data.filter((q: Quiz) => q.isActive && q.questions?.length > 0)
          setAvailableQuizzes(activeQuizzes)
        })
        .catch(() => setAvailableQuizzes([]))

      fetchAttempts()
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading full mock tests...</div>
      </div>
    )
  }

  // Get attempted quiz IDs for filtering
  const attemptedQuizIds = attemptedQuizzes.map((attempt: any) => attempt.quizId).filter(Boolean)
  
  // Filter out attempted quizzes and get only full mock tests
  const unattemptedQuizzes = availableQuizzes.filter((quiz: Quiz) => !attemptedQuizIds.includes(quiz.id))
  const fullMockTests = unattemptedQuizzes.filter((q: Quiz) => q.sections.length > 1)

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
              <h1 className="text-3xl font-bold text-foreground">Full Mock Tests</h1>
              <p className="text-muted-foreground">Complete practice tests with all sections</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Full Mock Tests */}
        <div className="mb-8">
          {fullMockTests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No full mock tests available yet</p>
                {user?.isAdmin && (
                  <Link href="/admin">
                    <Button>Create Full Mock Tests</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {fullMockTests.map((quiz) => (
                <Card key={quiz.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{quiz.title}</span>
                      <Badge variant="outline">{quiz.questions.length} questions</Badge>
                    </CardTitle>
                    <CardDescription>{quiz.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{quiz.duration} minutes</span>
                      </div>

                      <div className="flex gap-2">
                        {quiz.sections.map((section) => (
                          <Badge key={section} variant="secondary" className="text-xs capitalize">
                            {section}
                          </Badge>
                        ))}
                      </div>

                      <Link href={`/quiz/${quiz.id}`}>
                        <Button className="w-full">
                          <BookOpen className="h-4 w-4 mr-2" />
                          Start Full Mock Test
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
