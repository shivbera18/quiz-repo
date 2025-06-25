"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Target, Clock, Brain, Calculator, FileText, BookOpen } from "lucide-react"
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

export default function SectionalTestsPage() {
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
        <div className="text-center">Loading sectional tests...</div>
      </div>
    )
  }

  // Get attempted quiz IDs for filtering
  const attemptedQuizIds = attemptedQuizzes.map((attempt: any) => attempt.quizId).filter(Boolean)
  
  // Filter out attempted quizzes and get only sectional tests
  const unattemptedQuizzes = availableQuizzes.filter((quiz: Quiz) => !attemptedQuizIds.includes(quiz.id))
  const sectionalTests = unattemptedQuizzes.filter((q: Quiz) => q.sections.length === 1)

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
              <h1 className="text-3xl font-bold text-foreground">Sectional Tests</h1>
              <p className="text-muted-foreground">Practice specific sections individually</p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Sectional Tests */}
        <div className="mb-8">
          {sectionalTests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No sectional tests available yet</p>
                {user?.isAdmin && (
                  <Link href="/admin">
                    <Button>Create Sectional Tests</Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sectionalTests.map((quiz) => {
                const section = quiz.sections[0]
                const sectionConfig = {
                  reasoning: { icon: Brain, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
                  quantitative: { icon: Calculator, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
                  english: { icon: FileText, color: "text-green-600", bg: "bg-green-50", border: "border-green-200" },
                }
                const config = sectionConfig[section as keyof typeof sectionConfig] || {
                  icon: BookOpen,
                  color: "text-gray-600",
                  bg: "bg-gray-50",
                  border: "border-gray-200",
                }
                const IconComponent = config.icon

                return (
                  <Card key={quiz.id} className={`hover:shadow-lg transition-shadow cursor-pointer ${config.border}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${config.bg}`}>
                            <IconComponent className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <span>{quiz.title}</span>
                        </div>
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

                        <Badge variant="secondary" className="text-xs capitalize">
                          {section} Only
                        </Badge>

                        <Link href={`/quiz/${quiz.id}`}>
                          <Button className="w-full" variant="outline">
                            <IconComponent className="h-4 w-4 mr-2" />
                            Start {section.charAt(0).toUpperCase() + section.slice(1)} Test
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
