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
            <div>
              <h1 className="text-3xl font-bold text-foreground">Welcome back, {user.name}!</h1>
              <p className="text-muted-foreground">Ready to continue your exam preparation?</p>
            </div>
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

        {/* Mobile welcome section */}
        <div className="text-center mb-8 sm:hidden">
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome back, {user.name}!</h1>
          <p className="text-muted-foreground">Ready to continue your exam preparation?</p>
        </div>

        {/* Quick Stats Overview */}
        {!loadingAttempts && allAttempts.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4 mb-8">
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
        )}

        {/* Main Navigation Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Full Mock Tests Card */}
          <Link href="/dashboard/full-mock-tests">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:border-blue-500">
              <CardContent className="p-6 text-center">
                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-100 transition-colors">
                  <BookOpen className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Full Mock Tests</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Complete comprehensive tests covering all sections
                </p>
                <Badge variant="outline" className="text-xs">
                  {fullMockTests.length} available
                </Badge>
              </CardContent>
            </Card>
          </Link>

          {/* Sectional Tests Card */}
          <Link href="/dashboard/sectional-tests">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:border-green-500">
              <CardContent className="p-6 text-center">
                <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-100 transition-colors">
                  <Target className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Sectional Tests</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Focus on specific sections for targeted practice
                </p>
                <Badge variant="outline" className="text-xs">
                  {sectionalTests.length} available
                </Badge>
              </CardContent>
            </Card>
          </Link>

          {/* Attempted Quizzes Card */}
          <Link href="/dashboard/attempted-quizzes">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:border-purple-500">
              <CardContent className="p-6 text-center">
                <div className="bg-purple-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-100 transition-colors">
                  <History className="h-8 w-8 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Attempted Quizzes</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Review all your quiz attempts and performance
                </p>
                <Badge variant="outline" className="text-xs">
                  {allAttempts.length} attempts
                </Badge>
              </CardContent>
            </Card>
          </Link>

          {/* Recent Attempts Card */}
          <Link href="/dashboard/recent-attempts">
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer group hover:border-orange-500">
              <CardContent className="p-6 text-center">
                <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-100 transition-colors">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Recent Attempts</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Quick access to your latest quiz attempts
                </p>
                <Badge variant="outline" className="text-xs">
                  {Math.min(5, allAttempts.length)} recent
                </Badge>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Preview of Recent Activity */}
        {!loadingAttempts && allAttempts.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Latest Activity
                </span>
                <Link href="/dashboard/recent-attempts">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {allAttempts.slice(0, 3).map((attempt) => (
                  <div key={attempt._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                        attempt.totalScore >= 80 ? 'bg-green-500' :
                        attempt.totalScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}>
                        {attempt.totalScore}%
                      </div>
                      <div>
                        <h4 className="font-medium text-sm">{attempt.quizName || 'Unknown Quiz'}</h4>
                        <p className="text-xs text-muted-foreground">
                          {new Date(attempt.date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Link href={`/results/${attempt._id}`}>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State for New Users */}
        {!loadingAttempts && allAttempts.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">Welcome to Your Dashboard!</h3>
              <p className="text-muted-foreground mb-6">
                Start your exam preparation journey by taking your first quiz.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/dashboard/full-mock-tests">
                  <Button className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Browse Full Mock Tests
                  </Button>
                </Link>
                <Link href="/dashboard/sectional-tests">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Try Sectional Tests
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Additional Quick Links */}
        <div className="grid md:grid-cols-3 gap-6">
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
      </div>
    </div>
  )
}
