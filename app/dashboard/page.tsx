"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  BookOpen,
  TrendingUp,
  History,
  Settings,
  Clock,
  Target,
  LogOut,
  User,
  Brain,
  Calculator,
  FileText,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"

interface RecentAttempt {
  _id: string
  date: string
  totalScore: number
  quizName: string
  sections: {
    reasoning: number
    quantitative: number
    english: number
  }
}

interface Quiz {
  id: string
  title: string
  description: string
  duration: number
  sections: string[]
  questions: any[]
  isActive: boolean
}

interface Goal {
  id: string
  title: string
  current: number
  target: number
  status: "active" | "completed" | "expired"
}

export default function DashboardPage() {
  const { user, loading, logout } = useAuth()
  const [recentAttempts, setRecentAttempts] = useState<RecentAttempt[]>([])
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([])
  const [activeGoals, setActiveGoals] = useState<Goal[]>([])

  useEffect(() => {
    if (!loading && user) {
      // Load recent attempts from localStorage
      const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
      const sortedResults = results
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)

      setRecentAttempts(sortedResults)

      // Load available quizzes
      const quizzes = JSON.parse(localStorage.getItem("adminQuizzes") || "[]")
      const activeQuizzes = quizzes.filter((q: Quiz) => q.isActive && q.questions.length > 0)
      setAvailableQuizzes(activeQuizzes)

      // Load active goals
      const goals = JSON.parse(localStorage.getItem("performanceGoals") || "[]")
      const activeGoalsList = goals.filter((g: Goal) => g.status === "active").slice(0, 3)
      setActiveGoals(activeGoalsList)
    }
  }, [loading, user])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading dashboard...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please log in to access the dashboard</p>
          <Link href="/auth/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  // Separate quizzes by type
  const fullMockTests = availableQuizzes.filter((q) => q.sections.length > 1)
  const sectionalTests = availableQuizzes.filter((q) => q.sections.length === 1)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Welcome back, {user.name}!</h1>
            <p className="text-muted-foreground">Ready to continue your exam preparation?</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {user.userType}
            </Badge>
            <ThemeToggle />
            {user.isAdmin && (
              <Link href="/admin">
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Panel
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Full Mock Tests */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Full Mock Tests
          </h2>
          {fullMockTests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No full mock tests available yet</p>
                {user.isAdmin && (
                  <Link href="/admin">
                    <Button>Go to Admin Panel</Button>
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

                      <div className="flex gap-1">
                        {quiz.sections.map((section) => (
                          <Badge key={section} variant="secondary" className="text-xs">
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

        {/* Sectional Mock Tests */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Target className="h-6 w-6" />
            Sectional Mock Tests
          </h2>
          {sectionalTests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No sectional tests available yet</p>
                {user.isAdmin && (
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
                  reasoning: { icon: Brain, color: "text-purple-600", bg: "bg-purple-50" },
                  quantitative: { icon: Calculator, color: "text-blue-600", bg: "bg-blue-50" },
                  english: { icon: FileText, color: "text-green-600", bg: "bg-green-50" },
                }
                const config = sectionConfig[section as keyof typeof sectionConfig] || {
                  icon: BookOpen,
                  color: "text-gray-600",
                  bg: "bg-gray-50",
                }
                const IconComponent = config.icon

                return (
                  <Card key={quiz.id} className="hover:shadow-lg transition-shadow cursor-pointer">
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

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/goals">
              <CardHeader className="text-center">
                <Target className="h-12 w-12 mx-auto text-purple-600 mb-2" />
                <CardTitle>Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">Set and track your performance goals</CardDescription>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/history">
              <CardHeader className="text-center">
                <History className="h-12 w-12 mx-auto text-orange-600 mb-2" />
                <CardTitle>History</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">Review your past attempts and progress</CardDescription>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/analytics">
              <CardHeader className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-red-600 mb-2" />
                <CardTitle>Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center">Detailed performance analysis and insights</CardDescription>
              </CardContent>
            </Link>
          </Card>

          {user.isAdmin && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <Link href="/admin">
                <CardHeader className="text-center">
                  <Settings className="h-12 w-12 mx-auto text-blue-600 mb-2" />
                  <CardTitle>Admin</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">Manage quizzes and questions</CardDescription>
                </CardContent>
              </Link>
            </Card>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Recent Attempts */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Attempts</CardTitle>
              <CardDescription>Your latest quiz attempts and scores</CardDescription>
            </CardHeader>
            <CardContent>
              {recentAttempts.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No attempts yet</p>
                  {availableQuizzes.length > 0 && (
                    <p className="text-sm text-muted-foreground">Take a quiz to see your results here</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentAttempts.map((attempt) => (
                    <div key={attempt._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{attempt.quizName || "Quiz"}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(attempt.date).toLocaleDateString()} - Total Score: {attempt.totalScore}%
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="secondary">R: {attempt.sections.reasoning}%</Badge>
                        <Badge variant="secondary">Q: {attempt.sections.quantitative}%</Badge>
                        <Badge variant="secondary">E: {attempt.sections.english}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Goals */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Active Goals</CardTitle>
                  <CardDescription>Your current performance targets</CardDescription>
                </div>
                <Link href="/goals">
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {activeGoals.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No active goals</p>
                  <Link href="/goals">
                    <Button>Set Your First Goal</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeGoals.map((goal) => (
                    <div key={goal.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-sm">{goal.title}</p>
                        <span className="text-sm text-muted-foreground">
                          {goal.current}/{goal.target}
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
