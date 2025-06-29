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
  Trophy,
  Flame,
  Calendar,
  Star,
  Zap,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer"
import { Menu } from "lucide-react"
import { ActivityCalendar } from "@/components/activity-calendar"
import { FlashQuestions } from "@/components/flash-questions"

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
  const [showFlashQuestions, setShowFlashQuestions] = useState(false)
  const [showLatestActivity, setShowLatestActivity] = useState(false)
  const [flashQuestions, setFlashQuestions] = useState<any[]>([])

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
          console.log('📊 Raw quiz data received:', data)
          // Handle both array and object responses
          const quizzesArray = Array.isArray(data) ? data : (data.value || data)
          console.log('📊 Quizzes array:', quizzesArray)
          const activeQuizzes = quizzesArray.filter((q: Quiz) => q.isActive && q.questions?.length > 0)
          console.log('📊 Active quizzes:', activeQuizzes)
          setAvailableQuizzes(activeQuizzes)
          
          // Prepare flash questions from all available quizzes
          const allQuestions = activeQuizzes.flatMap((quiz: Quiz) => 
            quiz.questions?.map((q: any) => ({
              id: q.id || Math.random().toString(),
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              section: q.section || 'General'
            })) || []
          )
          
          // Shuffle and take 10 random questions for flash mode
          const shuffled = allQuestions.sort(() => Math.random() - 0.5)
          setFlashQuestions(shuffled.slice(0, 10))
        })
        .catch((error) => {
          console.error("❌ Error fetching quizzes:", error)
          setAvailableQuizzes([])
        })

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

  // Get attempted quiz IDs for filtering
  const attemptedQuizIds = allAttempts.map((attempt: RecentAttempt) => attempt.quizId).filter(Boolean)
  
  // Filter out attempted quizzes from available quizzes
  const unattemptedQuizzes = availableQuizzes.filter((quiz: Quiz) => !attemptedQuizIds.includes(quiz.id))
  
  // Separate unattempted quizzes by type
  const fullMockTests = unattemptedQuizzes.filter((q: Quiz) => q.sections.length > 1)
  const sectionalTests = unattemptedQuizzes.filter((q: Quiz) => q.sections.length === 1)

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
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-6 mb-8">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-2 sm:p-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs sm:text-sm text-blue-600 font-medium">Total Attempts</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-700">{allAttempts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-2 sm:p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="text-xs sm:text-sm text-green-600 font-medium">Average Score</p>
                    <p className="text-lg sm:text-2xl font-bold text-green-700">
                      {Math.round(allAttempts.reduce((sum, a) => sum + a.totalScore, 0) / allAttempts.length)}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-2 sm:p-4">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-xs sm:text-sm text-purple-600 font-medium">Best Score</p>
                    <p className="text-lg sm:text-2xl font-bold text-purple-700">
                      {Math.max(...allAttempts.map(a => a.totalScore))}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-2 sm:p-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-xs sm:text-sm text-orange-600 font-medium">Avg Time</p>
                    <p className="text-lg sm:text-2xl font-bold text-orange-700">
                      {Math.round(allAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / allAttempts.length / 60)}m
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Activity Calendar */}
        {!loadingAttempts && allAttempts.length > 0 && (
          <div className="mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer select-none" onClick={() => setShowLatestActivity((prev) => !prev)}>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="h-5 w-5" />
                  Activity Calendar
                </CardTitle>
                <Button variant="ghost" size="icon" aria-label="Toggle Activity Calendar">
                  {showLatestActivity ? <Eye className="h-5 w-5" /> : <Eye className="h-5 w-5 opacity-30" />}
                </Button>
              </CardHeader>
              {showLatestActivity && (
                <CardContent>
                  <ActivityCalendar attempts={allAttempts} />
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* Flash Questions Feature */}
        {flashQuestions.length > 0 && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-purple-600 to-purple-800 text-white">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 sm:p-3 rounded-full flex-shrink-0">
                      <Zap className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold truncate">Flash Quick Questions</h3>
                      <p className="text-purple-100 text-xs sm:text-sm">
                        Rapid-fire practice with 10 random questions
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    className="bg-white text-purple-700 hover:bg-purple-50 flex items-center gap-2 w-full sm:w-auto justify-center"
                    onClick={() => setShowFlashQuestions(true)}
                  >
                    <Zap className="h-4 w-4" />
                    <span className="whitespace-nowrap">Start Flash Quiz</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Flash Questions Modal */}
            <FlashQuestions
              isOpen={showFlashQuestions}
              onClose={() => setShowFlashQuestions(false)}
              questions={flashQuestions}
            />
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
                  {attemptedQuizIds.length > 0 && (
                    <span className="ml-1 text-muted-foreground">
                      ({attemptedQuizIds.filter(id => availableQuizzes.find(q => q.id === id && q.sections.length > 1)).length} completed)
                    </span>
                  )}
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
                  {attemptedQuizIds.length > 0 && (
                    <span className="ml-1 text-muted-foreground">
                      ({attemptedQuizIds.filter(id => availableQuizzes.find(q => q.id === id && q.sections.length === 1)).length} completed)
                    </span>
                  )}
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

        {/* Quick Preview of Recent Activity - Collapsible */}
        {!loadingAttempts && allAttempts.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="cursor-pointer" onClick={() => setShowLatestActivity(!showLatestActivity)}>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Clock className="h-5 w-5 flex-shrink-0" />
                  <span className="font-semibold truncate">Latest Activity</span>
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {allAttempts.length} total
                  </Badge>
                </div>
                <div className="flex items-center gap-2 justify-between sm:justify-end">
                  <Link href="/dashboard/recent-attempts" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">View All</span>
                      <span className="sm:hidden">All</span>
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-8 h-8 p-0 flex items-center justify-center hover:bg-muted"
                    aria-label={showLatestActivity ? "Collapse" : "Expand"}
                  >
                    <span className="text-lg font-bold">
                      {showLatestActivity ? '−' : '+'}
                    </span>
                  </Button>
                </div>
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Click to {showLatestActivity ? 'hide' : 'show'} your 3 most recent quiz attempts
              </CardDescription>
            </CardHeader>
            {showLatestActivity && (
              <CardContent>
                <div className="space-y-3">
                  {allAttempts.slice(0, 3).map((attempt) => (
                    <div key={attempt._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                          attempt.totalScore >= 80 ? 'bg-green-500' :
                          attempt.totalScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}>
                          {attempt.totalScore}%
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm truncate">{attempt.quizName || 'Unknown Quiz'}</h4>
                          <p className="text-xs text-muted-foreground">
                            {new Date(attempt.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Link href={`/results/${attempt._id}`}>
                        <Button variant="ghost" size="sm" className="flex-shrink-0">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer min-w-0">
            <Link href="/goals">
              <CardHeader className="text-center">
                <Target className="h-12 w-12 mx-auto text-purple-600 mb-2" />
                <CardTitle className="truncate">Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center break-words text-sm sm:text-base max-w-xs mx-auto">Set and track your performance goals</CardDescription>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer min-w-0">
            <Link href="/analytics">
              <CardHeader className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto text-red-600 mb-2" />
                <CardTitle className="truncate">Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-center break-words text-sm sm:text-base max-w-xs mx-auto">Detailed performance analysis and insights</CardDescription>
              </CardContent>
            </Link>
          </Card>

          {user.isAdmin && (
            <Card className="hover:shadow-lg transition-shadow cursor-pointer min-w-0">
              <Link href="/admin">
                <CardHeader className="text-center">
                  <Settings className="h-12 w-12 mx-auto text-blue-600 mb-2" />
                  <CardTitle className="truncate">Admin</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center break-words text-sm sm:text-base max-w-xs mx-auto">Manage quizzes and questions</CardDescription>
                </CardContent>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
