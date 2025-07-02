"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@/hooks/use-auth"
import { FlashQuestions } from "@/components/flash-questions"
import { ThemeToggle } from "@/components/theme-toggle"
import { ActivityCalendar } from "@/components/activity-calendar"
import { staggerContainer, staggerItem } from "@/components/page-transition"
import { 
  Bell, 
  ChevronDown, 
  University,
  ClipboardList, 
  TrendingUp, 
  Clock, 
  Flame,
  FileText,
  ChevronRight,
  Percent,
  Book,
  Landmark,
  Calculator,
  Zap,
  BookOpen,
  PieChart,
  Trophy,
  ArrowUp,
  ArrowDown,
  User,
  History,
  Target,
  LogOut,
  Settings,
  Eye,
  Menu,
  BarChart3,
  Calendar,
  Award,
  CheckCircle,
  XCircle,
  Minus,
  Search,
  Filter,
  Download,
  Share2,
  Star,
  BookMarked,
  Brain,
  Timer,
  Users,
  Play
} from "lucide-react"
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer"

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

  // Get attempted quiz IDs for filtering
  const attemptedQuizIds = allAttempts.map((attempt: RecentAttempt) => attempt.quizId).filter(Boolean)
  
  // Filter out attempted quizzes from available quizzes
  const unattemptedQuizzes = availableQuizzes.filter((quiz: Quiz) => !attemptedQuizIds.includes(quiz.id))
  
  // Separate unattempted quizzes by type
  const fullMockTests = unattemptedQuizzes.filter((q: Quiz) => q.sections.length > 1)
  const sectionalTests = unattemptedQuizzes.filter((q: Quiz) => q.sections.length === 1)

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

  return (
    <div className="min-h-screen neu-surface">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4 sm:gap-0">
          {/* Hamburger menu for mobile */}
          <div className="flex items-center sm:hidden">
            <Drawer>
              <DrawerTrigger asChild>
                <button className="neu-icon-button">
                  <Menu className="h-5 w-5" />
                </button>
              </DrawerTrigger>
              <DrawerContent className="neu-surface border-0">
                <DrawerHeader>
                  <DrawerTitle>Menu</DrawerTitle>
                </DrawerHeader>
                <div className="flex flex-col gap-4 p-4">
                  <Link href="/profile">
                    <Button variant="ghost" className="w-full flex items-center gap-2 hover:bg-muted/80 transition-colors">
                      <User className="h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                  <Link href="/analytics">
                    <Button variant="ghost" className="w-full flex items-center gap-2 hover:bg-muted/80 transition-colors">
                      <TrendingUp className="h-4 w-4" />
                      Analytics
                    </Button>
                  </Link>
                  <Link href="/history">
                    <Button variant="ghost" className="w-full flex items-center gap-2 hover:bg-muted/80 transition-colors">
                      <History className="h-4 w-4" />
                      History
                    </Button>
                  </Link>
                  <Link href="/goals">
                    <Button variant="ghost" className="w-full flex items-center gap-2 hover:bg-muted/80 transition-colors">
                      <Target className="h-4 w-4" />
                      Goals
                    </Button>
                  </Link>
                  <Button onClick={logout} variant="destructive" className="w-full flex items-center gap-2 shadow-sm">
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
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Welcome back, {user.name}!
              </h1>
              <p className="text-muted-foreground">Ready to continue your exam preparation?</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-muted/80 transition-colors">
                <User className="h-4 w-4" />
                Profile
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-muted/80 transition-colors">
                <TrendingUp className="h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-muted/80 transition-colors">
                <History className="h-4 w-4" />
                History
              </Button>
            </Link>
            <ThemeToggle />
            <Button onClick={logout} variant="destructive" className="flex items-center gap-2 shadow-sm">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>

        {/* Mobile welcome section */}
        <div className="text-center mb-8 sm:hidden">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent mb-2">
            Welcome back, {user.name}!
          </h1>
          <p className="text-muted-foreground">Ready to continue your exam preparation?</p>
        </div>

        {/* Quick Stats Overview */}
        {!loadingAttempts && allAttempts.length > 0 && (
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 mb-8 w-full overflow-x-auto"
          >
            <motion.div variants={staggerItem} className="bg-card/80 backdrop-blur-sm border border-border/20 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4 md:p-6 min-w-0 hover-lift">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <BookOpen className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Total Attempts</p>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold neu-text-gradient truncate">{allAttempts.length}</p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={staggerItem} className="bg-card/80 backdrop-blur-sm border border-border/20 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4 md:p-6 min-w-0 hover-lift">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <TrendingUp className="h-4 w-4 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Average Score</p>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold neu-text-gradient truncate">
                    {Math.round(allAttempts.reduce((sum, a) => sum + a.totalScore, 0) / allAttempts.length)}%
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={staggerItem} className="bg-card/80 backdrop-blur-sm border border-border/20 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4 md:p-6 min-w-0 hover-lift">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <Target className="h-4 w-4 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Best Score</p>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold neu-text-gradient truncate">
                    {Math.max(...allAttempts.map(a => a.totalScore))}%
                  </p>
                </div>
              </div>
            </motion.div>
            <motion.div variants={staggerItem} className="bg-card/80 backdrop-blur-sm border border-border/20 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 p-3 sm:p-4 md:p-6 min-w-0 hover-lift">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate">Avg Time</p>
                  <p className="text-lg sm:text-2xl md:text-3xl font-bold neu-text-gradient truncate">
                    {Math.round(allAttempts.reduce((sum, a) => sum + (a.timeSpent || 0), 0) / allAttempts.length / 60)}m
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Activity Calendar */}
        {!loadingAttempts && allAttempts.length > 0 && (
          <div className="mb-8">
            <Card className="shadow-sm hover:shadow-md transition-all duration-300 border-0 bg-gradient-to-r from-card to-card/80 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg" onClick={() => setShowLatestActivity((prev) => !prev)}>
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  Activity Calendar
                </CardTitle>
                <Button variant="ghost" size="icon" aria-label="Toggle Activity Calendar" className="rounded-full">
                  {showLatestActivity ? <Eye className="h-5 w-5" /> : <Eye className="h-5 w-5 opacity-50" />}
                </Button>
              </CardHeader>
              {showLatestActivity && (
                <CardContent className="border-t bg-muted/20">
                  <ActivityCalendar attempts={allAttempts} />
                </CardContent>
              )}
            </Card>
          </div>
        )}

        {/* Flash Questions Feature */}
        {flashQuestions.length > 0 && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600/90 to-indigo-600/90 backdrop-blur-sm"></div>
              <CardContent className="p-6 sm:p-8 relative z-10">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="bg-white/20 backdrop-blur-sm p-3 sm:p-4 rounded-2xl flex-shrink-0 shadow-lg">
                      <Zap className="h-6 w-6 sm:h-8 sm:w-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-xl sm:text-2xl font-bold mb-1">Flash Quick Questions</h3>
                      <p className="text-purple-100 text-sm sm:text-base opacity-90">
                        Rapid-fire practice with 10 random questions • Boost your speed & accuracy
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant="secondary" 
                    className="bg-white text-purple-700 hover:bg-white/90 flex items-center gap-2 w-full sm:w-auto justify-center font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
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
            />
          </div>
        )}

        {/* Main Navigation Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Full Mock Tests Card */}
          <Link href="/dashboard/full-mock-tests" className="flex">
            <Card className="w-full flex flex-col hover:shadow-xl transition-all duration-300 cursor-pointer group hover:border-blue-500/50 hover:-translate-y-1 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8 text-center flex flex-col flex-grow">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <BookOpen className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-blue-600 transition-colors">Full Mock Tests</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-grow">
                  Complete comprehensive tests covering all sections for exam simulation
                </p>
                <div className="mt-auto">
                  <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
                    {fullMockTests.length} available
                    {attemptedQuizIds.length > 0 && (
                      <span className="ml-1 text-muted-foreground">
                        ({attemptedQuizIds.filter(id => availableQuizzes.find(q => q.id === id && q.sections.length > 1)).length} completed)
                      </span>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Sectional Tests Card */}
          <Link href="/dashboard/sectional-tests" className="flex">
            <Card className="w-full flex flex-col hover:shadow-xl transition-all duration-300 cursor-pointer group hover:border-green-500/50 hover:-translate-y-1 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8 text-center flex flex-col flex-grow">
                <div className="bg-gradient-to-br from-green-500 to-green-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Target className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-green-600 transition-colors">Sectional Tests</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-grow">
                  Focus on specific sections for targeted practice and skill improvement
                </p>
                <div className="mt-auto">
                  <Badge variant="outline" className="text-xs font-medium bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
                    {sectionalTests.length} available
                    {attemptedQuizIds.length > 0 && (
                      <span className="ml-1 text-muted-foreground">
                        ({attemptedQuizIds.filter(id => availableQuizzes.find(q => q.id === id && q.sections.length === 1)).length} completed)
                      </span>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Attempted Quizzes Card */}
          <Link href="/dashboard/attempted-quizzes" className="flex">
            <Card className="w-full flex flex-col hover:shadow-xl transition-all duration-300 cursor-pointer group hover:border-purple-500/50 hover:-translate-y-1 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8 text-center flex flex-col flex-grow">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <History className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-purple-600 transition-colors">Attempted Quizzes</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-grow">
                  Review all your quiz attempts and track your performance progress
                </p>
                <div className="mt-auto">
                  <Badge variant="outline" className="text-xs font-medium bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
                    {allAttempts.length} attempts
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Recent Attempts Card */}
          <Link href="/dashboard/recent-attempts" className="flex">
            <Card className="w-full flex flex-col hover:shadow-xl transition-all duration-300 cursor-pointer group hover:border-orange-500/50 hover:-translate-y-1 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm border-0 shadow-lg">
              <CardContent className="p-8 text-center flex flex-col flex-grow">
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Clock className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-orange-600 transition-colors">Recent Attempts</h3>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed flex-grow">
                  Quick access to your latest quiz attempts and recent performance
                </p>
                <div className="mt-auto">
                  <Badge variant="outline" className="text-xs font-medium bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
                    {Math.min(5, allAttempts.length)} recent
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Quick Preview of Recent Activity - Collapsible */}
        {!loadingAttempts && allAttempts.length > 0 && (
          <Card className="mb-8 shadow-sm hover:shadow-md transition-all duration-300 border-0 bg-gradient-to-r from-card to-card/90 backdrop-blur-sm">
            <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors rounded-t-lg" onClick={() => setShowLatestActivity(!showLatestActivity)}>
              <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Clock className="h-5 w-5 text-primary flex-shrink-0" />
                  </div>
                  <span className="font-bold text-lg truncate">Latest Activity</span>
                  <Badge variant="secondary" className="text-xs flex-shrink-0 bg-primary/10 text-primary border-primary/20">
                    {allAttempts.length} total
                  </Badge>
                </div>
                <div className="flex items-center gap-3 justify-between sm:justify-end">
                  <Link href="/dashboard/recent-attempts" onClick={(e) => e.stopPropagation()}>
                    <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors">
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">View All</span>
                      <span className="sm:hidden">All</span>
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-8 h-8 p-0 flex items-center justify-center hover:bg-muted rounded-full"
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
              <CardContent className="border-t bg-muted/10">
                <div className="space-y-4">
                  {allAttempts.slice(0, 3).map((attempt) => (
                    <div key={attempt._id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-all duration-300 hover:shadow-sm bg-background/50 backdrop-blur-sm">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className={`w-12 h-12 flex-shrink-0 rounded-2xl flex items-center justify-center font-bold text-white text-sm shadow-lg ${
                          attempt.totalScore >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                          attempt.totalScore >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' : 'bg-gradient-to-r from-red-500 to-red-600'
                        }`}>
                          {attempt.totalScore}%
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-semibold text-base truncate">{attempt.quizName || 'Unknown Quiz'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(attempt.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      </div>
                      <Link href={`/results/${attempt._id}`}>
                        <Button variant="ghost" size="sm" className="flex-shrink-0 hover:bg-primary/10 hover:text-primary rounded-full">
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
          <Card className="text-center py-16 shadow-lg border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm">
            <CardContent>
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <BookOpen className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Welcome to Your Dashboard!
              </h3>
              <p className="text-muted-foreground mb-8 text-lg max-w-md mx-auto leading-relaxed">
                Start your exam preparation journey by taking your first quiz and unlock your potential.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-sm mx-auto">
                <Link href="/dashboard/full-mock-tests">
                  <Button className="flex items-center gap-2 w-full sm:w-auto bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300">
                    <BookOpen className="h-4 w-4" />
                    Browse Full Mock Tests
                  </Button>
                </Link>
                <Link href="/dashboard/sectional-tests">
                  <Button variant="outline" className="flex items-center gap-2 w-full sm:w-auto hover:bg-muted/80 border-2 hover:border-primary/30 transition-all duration-300">
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
          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer min-w-0 border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm shadow-md hover:-translate-y-1">
            <Link href="/goals">
              <CardHeader className="text-center pb-4">
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="truncate text-xl font-bold">Goals</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-center break-words text-sm leading-relaxed max-w-xs mx-auto">
                  Set and track your performance goals to stay motivated and focused
                </CardDescription>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer min-w-0 border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm shadow-md hover:-translate-y-1">
            <Link href="/analytics">
              <CardHeader className="text-center pb-4">
                <div className="bg-gradient-to-br from-red-500 to-red-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="truncate text-xl font-bold">Analytics</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-center break-words text-sm leading-relaxed max-w-xs mx-auto">
                  Detailed performance analysis and insights to improve your scores
                </CardDescription>
              </CardContent>
            </Link>
          </Card>

          {user.isAdmin && (
            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer min-w-0 border-0 bg-gradient-to-br from-card to-card/80 backdrop-blur-sm shadow-md hover:-translate-y-1">
              <Link href="/admin">
                <CardHeader className="text-center pb-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Settings className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="truncate text-xl font-bold">Admin</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-center break-words text-sm leading-relaxed max-w-xs mx-auto">
                    Manage quizzes and questions for the entire platform
                  </CardDescription>
                </CardContent>
              </Link>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
