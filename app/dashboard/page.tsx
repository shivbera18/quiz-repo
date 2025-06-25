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
  Eye,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer"
import { Menu } from "lucide-react"

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
  const [allAttempts, setAllAttempts] = useState<RecentAttempt[]>([])
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([])
  const [activeGoals, setActiveGoals] = useState<Goal[]>([])
  const [loadingAttempts, setLoadingAttempts] = useState(true)

  useEffect(() => {
    if (!loading && user) {
      // Fetch attempted quizzes from API
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
            setRecentAttempts(sortedAttempts.slice(0, 5))
          } else {
            // Fallback to localStorage if API fails
            const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
            const sortedResults = results
              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            
            setAllAttempts(sortedResults)
            setRecentAttempts(sortedResults.slice(0, 5))
          }
        } catch (error) {
          console.error("Failed to fetch attempts:", error)
          // Fallback to localStorage
          const results = JSON.parse(localStorage.getItem("quizResults") || "[]")
          const sortedResults = results
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
          
          setAllAttempts(sortedResults)
          setRecentAttempts(sortedResults.slice(0, 5))
        } finally {
          setLoadingAttempts(false)
        }
      }

      fetchAttempts()

      // Fetch available quizzes from backend (with cache-busting)
      fetch("/api/quizzes", {
        headers: {
          Authorization: `Bearer ${user.token || "student-token-placeholder"}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
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
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 sm:gap-0">
          {/* Hamburger menu for mobile */}
          <div className="flex items-center sm:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Menu</DrawerTitle>
                </DrawerHeader>
                <div className="flex flex-col gap-4 p-4">
                  <Link href="/profile">
                    <Button variant="ghost" className="w-full flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                  <Link href="/analytics">
                    <Button variant="ghost" className="w-full flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Analytics
                    </Button>
                  </Link>
                  <Link href="/history">
                    <Button variant="ghost" className="w-full flex items-center gap-2">
                      <History className="h-4 w-4" />
                      History
                    </Button>
                  </Link>
                  <Link href="/goals">
                    <Button variant="ghost" className="w-full flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Goals
                    </Button>
                  </Link>
                  <Button onClick={logout} variant="destructive" className="w-full flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                  <ThemeToggle />
                  <DrawerClose asChild>
                    <Button variant="outline" className="w-full mt-2">Close</Button>
                  </DrawerClose>
                </div>
              </DrawerContent>
            </Drawer>
          </div>
          {/* Main header content (hidden on mobile) */}
          <div className="hidden sm:flex items-center gap-4">
            <h1 className="text-3xl font-bold text-foreground">Welcome back, {user.name}!</h1>
            <p className="text-muted-foreground">Ready to continue your exam preparation?</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </Button>
            </Link>
            <ThemeToggle />
            <Button onClick={logout} variant="destructive" className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
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

        {/* Attempted Quizzes Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6" />
              Attempted Quizzes
            </h2>
            <Link href="/history">
              <Button variant="outline" size="sm">
                View All History
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
                <p className="text-sm text-muted-foreground">Start taking quizzes to track your progress here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {/* Summary Stats */}
              <div className="grid md:grid-cols-4 gap-4 mb-4">
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
                          {allAttempts.length > 0 
                            ? Math.round(allAttempts.reduce((sum, a) => sum + a.totalScore, 0) / allAttempts.length)
                            : 0}%
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
                          {allAttempts.length > 0 
                            ? Math.max(...allAttempts.map(a => a.totalScore))
                            : 0}%
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
                          {allAttempts.length > 0 
                            ? Math.round(allAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / allAttempts.length / 60)
                            : 0}m
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Attempts List */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Quiz Attempts</CardTitle>
                  <CardDescription>Your latest quiz performances</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {allAttempts.slice(0, 5).map((attempt, index) => (
                      <div key={attempt._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                            attempt.totalScore >= 80 ? 'bg-green-500' :
                            attempt.totalScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}>
                            {attempt.totalScore}%
                          </div>
                          <div>
                            <h4 className="font-semibold">{attempt.quizName || 'Unknown Quiz'}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{new Date(attempt.date).toLocaleDateString()}</span>
                              <span>✓ {attempt.correctAnswers} correct</span>
                              <span>✗ {attempt.wrongAnswers} wrong</span>
                              {attempt.timeSpent && (
                                <span>⏱ {Math.round(attempt.timeSpent / 60)}m</span>
                              )}
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
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {allAttempts.length > 5 && (
                    <div className="mt-4 text-center">
                      <Link href="/history">
                        <Button variant="outline">
                          View All {allAttempts.length} Attempts
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
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
