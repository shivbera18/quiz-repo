"use client"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ThemeToggle } from "@/components/theme-toggle"
import { Plus, Trash2, Users, BarChart3, Edit, Eye, Clock, BookOpen, LogOut, Shield, Sparkles, Trophy } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import AIQuizGenerator from "./ai-quiz-generator"

interface Quiz {
  id: string
  title: string
  description: string
  duration: number // in minutes
  sections: string[]
  questions: Question[]
  isActive: boolean
  createdAt: string
  createdBy: string
  negativeMarking: boolean
  negativeMarkValue: number
}

interface Question {
  id: string
  quizId: string
  section: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  createdAt: string
}

export default function AdminPage() {
  const { user, loading, logout } = useAuth(true) // Require admin access
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showQuizForm, setShowQuizForm] = useState(false)
  const [showAIQuizGenerator, setShowAIQuizGenerator] = useState(false)
  const [analytics, setAnalytics] = useState({
    totalUsers: 0,
    totalAttempts: 0,
    totalQuizzes: 0,
    activeQuizzes: 0,
    totalQuestions: 0,
    averageScore: 0,
    recentActivity: []
  })
  const [editingQuiz, setEditingQuiz] = useState<Quiz | null>(null)

  const [newQuiz, setNewQuiz] = useState({
    title: "",
    description: "",
    duration: 30,
    sections: [] as string[],
    negativeMarking: true,
    negativeMarkValue: 0.25,
  })

  // Mock initial quizzes
  const mockQuizzes: Quiz[] = [
    {
      id: "1",
      title: "Reasoning Mock Test 1",
      description: "Comprehensive reasoning ability test covering logical reasoning, puzzles, and analytical thinking",
      duration: 60,
      sections: ["reasoning"],
      questions: [
        {
          id: "q1",
          quizId: "1",
          section: "reasoning",
          question: "If all roses are flowers and some flowers fade quickly, which of the following must be true?",
          options: [
            "All roses fade quickly",
            "Some roses may fade quickly",
            "No roses fade quickly",
            "All flowers are roses",
          ],
          correctAnswer: 1,
          explanation:
            "Since some flowers fade quickly and roses are flowers, it's possible that some roses may fade quickly.",
          createdAt: new Date().toISOString(),
        },
        {
          id: "q2",
          quizId: "1",
          section: "reasoning",
          question: "In a certain code, COMPUTER is written as RFUVQNPC. How is MEDICINE written in the same code?",
          options: ["EOJDJEFM", "NFEJDJOF", "MFEJDJOF", "NFEDJJOF"],
          correctAnswer: 2,
          explanation: "Each letter is shifted by +3 positions in the alphabet.",
          createdAt: new Date().toISOString(),
        },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: "admin",
      negativeMarking: true,
      negativeMarkValue: 0.25,
    },
    {
      id: "2",
      title: "Quantitative Aptitude Mock 1",
      description: "Mathematical problems covering arithmetic, algebra, and data interpretation",
      duration: 45,
      sections: ["quantitative"],
      questions: [
        {
          id: "q3",
          quizId: "2",
          section: "quantitative",
          question: "What is 15% of 240?",
          options: ["36", "35", "38", "40"],
          correctAnswer: 0,
          explanation: "15% of 240 = (15/100) × 240 = 0.15 × 240 = 36",
          createdAt: new Date().toISOString(),
        },
        {
          id: "q4",
          quizId: "2",
          section: "quantitative",
          question: "If a train travels 60 km in 45 minutes, what is its speed in km/hr?",
          options: ["75", "80", "85", "90"],
          correctAnswer: 1,
          explanation: "Speed = Distance/Time = 60 km / (45/60) hours = 60 / 0.75 = 80 km/hr",
          createdAt: new Date().toISOString(),
        },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: "admin",
      negativeMarking: true,
      negativeMarkValue: 0.25,
    },
    {
      id: "3",
      title: "English Language Mock 1",
      description: "Grammar, vocabulary, and comprehension test",
      duration: 30,
      sections: ["english"],
      questions: [
        {
          id: "q5",
          quizId: "3",
          section: "english",
          question: "Choose the correct synonym for 'Abundant':",
          options: ["Scarce", "Plentiful", "Limited", "Rare"],
          correctAnswer: 1,
          explanation: "Abundant means existing in large quantities; plentiful is the closest synonym.",
          createdAt: new Date().toISOString(),
        },
      ],
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: "admin",
      negativeMarking: true,
      negativeMarkValue: 0.25,
    },
  ]

  useEffect(() => {
    if (!loading && user) {
      // Fetch quizzes and analytics from backend API
      const fetchData = async () => {
        try {
          setAdminLoading(true)
          setError("")
          
          // Fetch quizzes
          const res = await fetch("/api/admin/quizzes", {
            headers: {
              Authorization: `Bearer ${user.token || "admin-token-placeholder"}`,
            },
          })
          if (!res.ok) throw new Error("Failed to fetch quizzes")
          const data = await res.json()
          // Ensure all quizzes have questions array
          const safeQuizzes = (data.quizzes || []).map((quiz: any) => ({
            ...quiz,
            questions: quiz.questions || [],
          }))
          setQuizzes(safeQuizzes)
          
          // Fetch analytics after quizzes are loaded
          await fetchAnalytics()
          
        } catch (err) {
          setError("Failed to fetch data from database")
        } finally {
          setAdminLoading(false)
        }
      }
      fetchData()
    }
  }, [loading, user])

  // Save quizzes to backend (for create)
  const createQuiz = async () => {
    if (!newQuiz.title || newQuiz.sections.length === 0) {
      setError("Please provide a title and select at least one section")
      return
    }
    try {
      setError("")
      setSuccess("")
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
        },
        body: JSON.stringify({
          title: newQuiz.title,
          description: newQuiz.description,
          duration: newQuiz.duration,
          sections: newQuiz.sections,
          questions: [],
          negativeMarking: newQuiz.negativeMarking,
          negativeMarkValue: newQuiz.negativeMarkValue,
        }),
      })
      if (!res.ok) throw new Error("Failed to create quiz")
      setSuccess("Quiz created successfully!")
      setNewQuiz({
        title: "",
        description: "",
        duration: 30,
        sections: [],
        negativeMarking: true,
        negativeMarkValue: 0.25,
      })
      setShowQuizForm(false)
      // Refetch quizzes
      const data = await res.json()
      setQuizzes((prev) => [...prev, data.quiz])
    } catch (err) {
      setError("Failed to create quiz in database")
    }
  }

  const handleSectionChange = (section: string, checked: boolean) => {
    setNewQuiz((prev) => ({
      ...prev,
      sections: checked ? [...prev.sections, section] : prev.sections.filter((s) => s !== section),
    }))
  }

  const handleEditQuiz = (quiz: Quiz) => {
    setEditingQuiz(quiz)
    setNewQuiz({
      title: quiz.title,
      description: quiz.description,
      duration: quiz.duration,
      sections: quiz.sections,
      negativeMarking: quiz.negativeMarking ?? true,
      negativeMarkValue: quiz.negativeMarkValue ?? 0.25,
    })
    setShowQuizForm(true)
  }

  const handleUpdateQuiz = async () => {
    if (!editingQuiz) return

    try {
      setError("")
      setSuccess("")
      
      const res = await fetch(`/api/admin/quizzes/${editingQuiz.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
        },
        body: JSON.stringify({
          title: newQuiz.title,
          description: newQuiz.description,
          duration: newQuiz.duration,
          sections: newQuiz.sections,
          questions: editingQuiz.questions, // Keep existing questions
          isActive: editingQuiz.isActive, // Keep existing active status
          negativeMarking: newQuiz.negativeMarking,
          negativeMarkValue: newQuiz.negativeMarkValue,
        }),
      })

      if (!res.ok) throw new Error("Failed to update quiz")
      
      const data = await res.json()
      
      // Update local state with response data
      const updatedQuizzes = quizzes.map((q) => (q.id === editingQuiz.id ? data.quiz : q))
      setQuizzes(updatedQuizzes)
      setSuccess("Quiz updated successfully!")
      
      // Reset form
      setShowQuizForm(false)
      setEditingQuiz(null)
      setNewQuiz({
        title: "",
        description: "",
        duration: 30,
        sections: [],
        negativeMarking: true,
        negativeMarkValue: 0.25,
      })
    } catch (err) {
      setError("Failed to update quiz in database")
    }
  }

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? All questions will be permanently removed.")) return

    try {
      setError("")
      setSuccess("")
      const res = await fetch(`/api/admin/quizzes/${quizId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
        },
      })
      if (!res.ok) throw new Error("Failed to delete quiz")
      
      // Remove from local state after successful deletion
      const updatedQuizzes = quizzes.filter((q) => q.id !== quizId)
      setQuizzes(updatedQuizzes)
      setSuccess("Quiz deleted successfully!")
    } catch (err) {
      setError("Failed to delete quiz from database")
    }
  }

  const handleToggleQuizStatus = async (quizId: string) => {
    try {
      setError("")
      setSuccess("")
      const quiz = quizzes.find(q => q.id === quizId)
      if (!quiz) return
      
      const res = await fetch(`/api/admin/quizzes/${quizId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
        },
        body: JSON.stringify({
          ...quiz,
          isActive: !quiz.isActive,
        }),
      })
      if (!res.ok) throw new Error("Failed to update quiz status")
      
      // Update local state after successful update
      const updatedQuizzes = quizzes.map((q) => (q.id === quizId ? { ...q, isActive: !q.isActive } : q))
      setQuizzes(updatedQuizzes)
      setSuccess("Quiz status updated!")
    } catch (err) {
      setError("Failed to update quiz status in database")
    }
  }

  const handleAIQuizCreated = (quiz: Quiz) => {
    setQuizzes((prev) => [...prev, quiz])
    setShowAIQuizGenerator(false)
    setSuccess(`Successfully created AI quiz "${quiz.title}" with ${quiz.questions.length} questions!`)
  }

  const getQuizResults = () => {
    if (typeof window === "undefined") return [] // SSR/Build phase
    try {
      return JSON.parse(localStorage.getItem("quizResults") || "[]")
    } catch {
      return []
    }
  }

  const fetchAnalytics = async () => {
    try {
      // Try to fetch from API first
      const response = await fetch("/api/admin/analytics")
      if (response.ok) {
        const data = await response.json()
        const results = data.results || []
        const quizData = data.quizzes || []
        
        // Calculate comprehensive stats
        const totalUsers = new Set(results.map((r: any) => r.userId || r.user?.id || 'anonymous')).size || 1
        const totalAttempts = results.length
        const averageScore = results.length > 0 ? 
          Math.round(results.reduce((sum: number, r: any) => sum + (r.totalScore || 0), 0) / results.length) : 0
        
        const analyticsData = {
          totalUsers,
          totalAttempts,
          totalQuizzes: quizData.length,
          activeQuizzes: quizData.filter((q: any) => q.isActive !== false).length,
          totalQuestions: quizData.reduce((sum: number, quiz: any) => sum + (quiz.questions?.length || 0), 0),
          averageScore,
          recentActivity: results.slice(-5)
        }
        
        setAnalytics(analyticsData)
      } else {
        throw new Error('API failed')
      }
    } catch (error) {
      console.warn('API fetch failed, using localStorage fallback')
      // Fallback to localStorage
      const localResults = getQuizResults()
      const fallbackAnalytics = {
        totalUsers: localResults.length > 0 ? new Set(localResults.map((r: any) => r.userId || 'user')).size : 1,
        totalAttempts: localResults.length,
        totalQuizzes: quizzes.length,
        activeQuizzes: quizzes.filter((q) => q.isActive).length,
        totalQuestions: quizzes.reduce((sum, quiz) => sum + (quiz.questions?.length || 0), 0),
        averageScore: localResults.length > 0 ? 
          Math.round(localResults.reduce((sum: number, r: any) => sum + (r.totalScore || 0), 0) / localResults.length) : 0,
        recentActivity: localResults.slice(-5)
      }
      setAnalytics(fallbackAnalytics)
    }
  }

  const stats = {
    totalUsers: analytics.totalUsers,
    totalAttempts: analytics.totalAttempts,
    totalQuizzes: analytics.totalQuizzes,
    activeQuizzes: analytics.activeQuizzes,
    totalQuestions: analytics.totalQuestions,
    averageScore: analytics.averageScore,
  }

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading admin panel...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Admin access required</p>
          <Link href="/auth/login">
            <Button>Go to Login</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-blue-600" />
              Admin Panel
            </h1>
            <p className="text-muted-foreground">
              Welcome, {user.name} - Manage individual quizzes and their questions
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Administrator
            </Badge>
            <ThemeToggle />
            <Link href="/dashboard">
              <Button variant="outline">Student Dashboard</Button>
            </Link>
            <Button variant="outline" onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="quizzes">Manage Quizzes</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalUsers}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Total Attempts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalAttempts}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Total Quizzes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalQuizzes}</div>
                  <p className="text-xs text-muted-foreground">{stats.activeQuizzes} active</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.totalQuestions}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Average Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{stats.averageScore}%</div>
                  <p className="text-xs text-muted-foreground">across all attempts</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/admin/analytics">
                  <CardHeader className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto text-blue-600 mb-2" />
                    <CardTitle>Advanced Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">Detailed performance insights and trends</CardDescription>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/admin/users">
                  <CardHeader className="text-center">
                    <Users className="h-12 w-12 mx-auto text-green-600 mb-2" />
                    <CardTitle>User Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">Manage user accounts and monitor activity</CardDescription>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <Link href="/admin/question-bank">
                  <CardHeader className="text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-purple-600 mb-2" />
                    <CardTitle>Question Bank</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center">
                      Centralized question repository for all quizzes
                    </CardDescription>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader className="text-center">
                  <Clock className="h-12 w-12 mx-auto text-orange-600 mb-2" />
                  <CardTitle>Scheduled Exams</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    Schedule and manage timed exams (Coming Soon)
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            {analytics.recentActivity && analytics.recentActivity.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Recent Quiz Attempts
                  </CardTitle>
                  <CardDescription>Latest quiz submissions from users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.recentActivity.map((activity: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{activity.quizName || 'Unknown Quiz'}</div>
                          <div className="text-sm text-muted-foreground">
                            Score: {activity.totalScore || 0}% • {new Date(activity.date || activity.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge variant={
                          (activity.totalScore || 0) >= 80 ? "default" : 
                          (activity.totalScore || 0) >= 60 ? "secondary" : "destructive"
                        }>
                          {activity.totalScore || 0}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Quizzes Management Tab */}
          <TabsContent value="quizzes">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Quiz Management</h2>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => setShowAIQuizGenerator(true)}
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Quiz Generator
                  </Button>
                  <Button onClick={() => setShowQuizForm(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Manually
                  </Button>
                </div>
              </div>

              {/* Quiz Form */}
              {showQuizForm && (
                <Card>
                  <CardHeader>
                    <CardTitle>{editingQuiz ? "Edit Quiz" : "Create New Quiz"}</CardTitle>
                    <CardDescription>
                      {editingQuiz ? "Update quiz details" : "Create a new quiz with custom questions"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {error && (
                      <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}

                    {success && (
                      <Alert>
                        <AlertDescription>{success}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quizTitle">Quiz Title *</Label>
                        <Input
                          id="quizTitle"
                          placeholder="e.g., Reasoning Mock Test 1"
                          value={newQuiz.title}
                          onChange={(e) => setNewQuiz((prev) => ({ ...prev, title: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="duration" className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Duration (minutes) *
                        </Label>
                        <div className="space-y-2">
                          <Select
                            value={newQuiz.duration.toString()}
                            onValueChange={(value) => {
                              if (value === "custom") {
                                // Keep current value for custom input
                                return
                              }
                              setNewQuiz((prev) => ({ ...prev, duration: Number.parseInt(value) }))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="15">15 minutes (Quick Test)</SelectItem>
                              <SelectItem value="30">30 minutes (Short Quiz)</SelectItem>
                              <SelectItem value="45">45 minutes (Standard)</SelectItem>
                              <SelectItem value="60">1 hour (Full Test)</SelectItem>
                              <SelectItem value="90">1.5 hours (Extended)</SelectItem>
                              <SelectItem value="120">2 hours (Long Exam)</SelectItem>
                              <SelectItem value="180">3 hours (Comprehensive)</SelectItem>
                              <SelectItem value="custom">Custom Duration</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {/* Custom duration input with range indicator */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min="1"
                                max="600"
                                value={newQuiz.duration}
                                onChange={(e) => setNewQuiz((prev) => ({ ...prev, duration: Number.parseInt(e.target.value) || 30 }))}
                                placeholder="Enter minutes"
                                className="flex-1"
                              />
                              <span className="text-sm text-muted-foreground">minutes</span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Range: 1-600 minutes (up to 10 hours) • Current: {Math.floor(newQuiz.duration / 60)}h {newQuiz.duration % 60}m
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        placeholder="Brief description of this quiz"
                        value={newQuiz.description}
                        onChange={(e) => setNewQuiz((prev) => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-3">
                      <Label>Primary Sections *</Label>
                      <div className="grid grid-cols-1 gap-3">
                        {[
                          { id: "reasoning", label: "Reasoning Ability", icon: "🧠" },
                          { id: "quantitative", label: "Quantitative Aptitude", icon: "🔢" },
                          { id: "english", label: "English Language", icon: "📝" },
                        ].map((section) => (
                          <div key={section.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`quiz-${section.id}`}
                              checked={newQuiz.sections.includes(section.id)}
                              onChange={(e) => handleSectionChange(section.id, e.target.checked)}
                              className="rounded"
                            />
                            <Label htmlFor={`quiz-${section.id}`} className="flex items-center gap-2 cursor-pointer">
                              <span>{section.icon}</span>
                              {section.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Negative Marking</Label>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="negativeMarking"
                            checked={newQuiz.negativeMarking}
                            onChange={(e) => setNewQuiz((prev) => ({ ...prev, negativeMarking: e.target.checked }))}
                            className="rounded"
                          />
                          <Label htmlFor="negativeMarking" className="cursor-pointer">
                            Enable negative marking for wrong answers
                          </Label>
                        </div>

                        {newQuiz.negativeMarking && (
                          <div className="ml-6 space-y-2">
                            <Label htmlFor="negativeMarkValue">Marks deducted per wrong answer</Label>
                            <Select
                              value={newQuiz.negativeMarkValue.toString()}
                              onValueChange={(value) =>
                                setNewQuiz((prev) => ({ ...prev, negativeMarkValue: Number.parseFloat(value) }))
                              }
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="0.25">0.25 marks</SelectItem>
                                <SelectItem value="0.33">0.33 marks</SelectItem>
                                <SelectItem value="0.5">0.5 marks</SelectItem>
                                <SelectItem value="1">1 mark</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={editingQuiz ? handleUpdateQuiz : createQuiz}>
                        {editingQuiz ? "Update Quiz" : "Create Quiz"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowQuizForm(false)
                          setEditingQuiz(null)
                          setNewQuiz({
                            title: "",
                            description: "",
                            duration: 30,
                            sections: [],
                            negativeMarking: true,
                            negativeMarkValue: 0.25,
                          })
                          setError("")
                          setSuccess("")
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Quiz Generator */}
              {showAIQuizGenerator && (
                <AIQuizGenerator
                  onQuizCreated={(quiz) => {
                    setQuizzes((prev) => [...prev, quiz])
                    setShowAIQuizGenerator(false)
                    setSuccess(`Successfully created AI quiz "${quiz.title}" with ${quiz.questions.length} questions!`)
                  }}
                  onClose={() => setShowAIQuizGenerator(false)}
                />
              )}

              {/* Quizzes List */}
              <div className="grid md:grid-cols-1 gap-6">
                {quizzes.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No quizzes created yet</p>
                      <Button onClick={() => setShowQuizForm(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Your First Quiz
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  quizzes.map((quiz) => (
                    <Card key={quiz.id} className={quiz.isActive ? "" : "opacity-60"}>
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              {quiz.title}
                              <Badge variant={quiz.isActive ? "default" : "secondary"}>
                                {quiz.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </CardTitle>
                            <CardDescription>{quiz.description}</CardDescription>
                          </div>
                          <div className="flex gap-1">
                            <Link href={`/admin/quiz/${quiz.id}`}>
                              <Button variant="ghost" size="icon" title="Manage Questions">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => handleEditQuiz(quiz)} title="Edit Quiz">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              title="Delete Quiz"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Duration:</span>
                              <p className="font-medium flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {quiz.duration} minutes
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Questions:</span>
                              <p className="font-medium">{quiz.questions?.length || 0}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Negative Marking:</span>
                              <p className="font-medium">
                                {quiz.negativeMarking ? `Yes (-${quiz.negativeMarkValue})` : "No"}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Status:</span>
                              <p className="font-medium">{quiz.isActive ? "Active" : "Inactive"}</p>
                            </div>
                          </div>

                          <div>
                            <span className="text-muted-foreground text-sm">Sections:</span>
                            <div className="flex gap-1 mt-1">
                              {quiz.sections.map((section) => (
                                <Badge key={section} variant="outline" className="text-xs">
                                  {section}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Link href={`/admin/quiz/${quiz.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                Manage Questions ({quiz.questions?.length || 0})
                              </Button>
                            </Link>
                            <Button variant="outline" size="sm" onClick={() => handleToggleQuizStatus(quiz.id)}>
                              {quiz.isActive ? "Deactivate" : "Activate"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
