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
import { Plus, Trash2, Users, BarChart3, Edit, Eye, Clock, BookOpen, Shield, Sparkles, Trophy, FileText, Brain, Hash, Pencil, Palette, Music, Megaphone } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import AIQuizGenerator from "./ai-quiz-generator"
import ManageQuizzesPage from "./manage-quizzes"
import QuizManagementSection from "./QuizManagementSection"
import { cn } from "@/lib/utils"


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

interface Subject {
  id: string
  name: string
  description: string
  icon?: string
  color?: string
  chapters?: Chapter[]
}

interface Chapter {
  id: string
  name: string
  description: string
  subjectId: string
}

export default function AdminPage() {
  const { user, loading, logout } = useAuth(true) // Require admin access
  const [mounted, setMounted] = useState(false)
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showQuizForm, setShowQuizForm] = useState(false)
  const [showAIQuizGenerator, setShowAIQuizGenerator] = useState(false)
  const [selectedAdminTab, setSelectedAdminTab] = useState("overview")
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
    subjectId: "",
    chapterId: "",
    sections: [] as string[],
    negativeMarking: true,
    negativeMarkValue: 0.25,
  })

  // Subject and Chapter data
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingChapters, setLoadingChapters] = useState(false)

  // Subject/Chapter management state
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [showChapterForm, setShowChapterForm] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [newSubject, setNewSubject] = useState({
    name: "",
    description: "",
    icon: "📚",
    color: "#3B82F6"
  })
  const [newChapter, setNewChapter] = useState({
    name: "",
    description: "",
    subjectId: ""
  })
  const [selectedSubjectForChapter, setSelectedSubjectForChapter] = useState("")

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

  // Prevent hydration mismatch by only rendering after client mount
  useEffect(() => {
    setMounted(true)
  }, [])

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
            sections: (() => {
              if (Array.isArray(quiz.sections)) {
                return quiz.sections;
              } else if (typeof quiz.sections === 'string') {
                try {
                  const parsed = JSON.parse(quiz.sections);
                  return Array.isArray(parsed) ? parsed : [];
                } catch {
                  return [];
                }
              }
              return [];
            })(),
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

  // Fetch subjects on component mount
  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      const response = await fetch(`/api/subjects?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      if (response.ok) {
        const data = await response.json()
        setSubjects(data)
      } else {
        console.error('Failed to load subjects')
      }
    } catch (error) {
      console.error('Error loading subjects:', error)
    } finally {
      setLoadingSubjects(false)
    }
  }

  const fetchChapters = async (subjectId: string) => {
    if (!subjectId) return

    setLoadingChapters(true)
    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      if (response.ok) {
        const data = await response.json()
        setChapters(data)
      } else {
        console.error('Failed to load chapters')
        setChapters([])
      }
    } catch (error) {
      console.error('Error loading chapters:', error)
      setChapters([])
    } finally {
      setLoadingChapters(false)
    }
  }

  const handleSubjectChange = (subjectId: string) => {
    const actualSubjectId = subjectId === "none" ? "" : subjectId
    setNewQuiz(prev => ({
      ...prev,
      subjectId: actualSubjectId,
      chapterId: "" // Reset chapter when subject changes
    }))
    if (actualSubjectId) {
      fetchChapters(actualSubjectId)
    } else {
      setChapters([])
    }
  }

  // Save quizzes to backend (for create)
  const createQuiz = async () => {
    // Clear previous messages
    setError("")
    setSuccess("")

    // Comprehensive validation with specific error messages
    if (!newQuiz.title.trim()) {
      setError("❌ Quiz title is required")
      return
    }

    if (newQuiz.title.trim().length < 3) {
      setError("❌ Quiz title must be at least 3 characters long")
      return
    }

    if (newQuiz.duration < 5) {
      setError("❌ Quiz duration must be at least 5 minutes")
      return
    }

    if (newQuiz.duration > 300) {
      setError("❌ Quiz duration cannot exceed 300 minutes (5 hours)")
      return
    }

    if (!newQuiz.subjectId || newQuiz.subjectId === "none") {
      setError("❌ Please select a subject - this is required for proper organization")
      return
    }

    if (!newQuiz.chapterId || newQuiz.chapterId === "none" || newQuiz.chapterId.trim() === "") {
      setError("❌ Please select a chapter - this is required for proper organization")
      return
    }

    if (!Array.isArray(newQuiz.sections) || newQuiz.sections.length === 0) {
      setError("❌ Please select at least one section (e.g., Quantitative, Reasoning, English)")
      return
    }

    if (newQuiz.negativeMarking && (newQuiz.negativeMarkValue <= 0 || newQuiz.negativeMarkValue > 1)) {
      setError("❌ Negative marking value must be between 0.1 and 1.0")
      return
    }

    console.log('🔧 Creating quiz with data:', {
      title: newQuiz.title,
      description: newQuiz.description,
      duration: newQuiz.duration,
      chapterId: newQuiz.chapterId,
      subjectId: newQuiz.subjectId,
      sections: newQuiz.sections,
      negativeMarking: newQuiz.negativeMarking,
      negativeMarkValue: newQuiz.negativeMarkValue,
    })

    try {
      const res = await fetch("/api/admin/quizzes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
        },
        body: JSON.stringify({
          title: newQuiz.title.trim(),
          description: newQuiz.description.trim(),
          duration: newQuiz.duration,
          chapterId: newQuiz.chapterId,
          sections: newQuiz.sections,
          questions: [],
          negativeMarking: newQuiz.negativeMarking,
          negativeMarkValue: newQuiz.negativeMarkValue,
        }),
      })

      console.log('📡 API Response status:', res.status)
      console.log('📡 API Response headers:', res.headers)

      if (!res.ok) {
        const errorText = await res.text()
        console.error('❌ API Error Response:', errorText)

        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { message: errorText }
        }

        // Specific error messages based on API response
        if (res.status === 400) {
          setError(`❌ Validation Error: ${errorData.message || errorData.error || 'Invalid quiz data provided'}`)
        } else if (res.status === 401) {
          setError("❌ Authentication Error: You are not authorized to create quizzes")
        } else if (res.status === 403) {
          setError("❌ Permission Error: You don't have permission to create quizzes")
        } else if (res.status === 404) {
          setError("❌ API Error: Quiz creation endpoint not found")
        } else if (res.status === 500) {
          setError(`❌ Database Error: ${errorData.message || 'Internal server error during quiz creation'}`)
        } else {
          setError(`❌ Unknown Error (${res.status}): ${errorData.message || errorData.error || 'Failed to create quiz'}`)
        }
        return
      }

      const data = await res.json()
      console.log('✅ Quiz creation successful:', data)

      if (!data.quiz) {
        setError("❌ Server Error: Quiz was created but response format is invalid")
        return
      }

      setSuccess(`✅ Quiz "${data.quiz.title}" created successfully! You can now add questions to it.`)
      setNewQuiz({
        title: "",
        description: "",
        duration: 30,
        subjectId: "",
        chapterId: "",
        sections: [],
        negativeMarking: true,
        negativeMarkValue: 0.25,
      })
      setShowQuizForm(false)

      // Refetch quizzes to show the new one
      const updatedQuizzes = await fetch("/api/admin/quizzes", {
        headers: {
          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
        },
      })
      if (updatedQuizzes.ok) {
        const updatedData = await updatedQuizzes.json()
        setQuizzes(updatedData.quizzes || [])
      }

    } catch (err) {
      console.error('❌ Network/JavaScript Error:', err)

      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError("❌ Network Error: Cannot connect to server. Please check your internet connection.")
      } else if (err instanceof SyntaxError) {
        setError("❌ Response Error: Server returned invalid data format")
      } else if (err instanceof Error && err.name === 'AbortError') {
        setError("❌ Timeout Error: Request took too long to complete")
      } else {
        const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
        setError(`❌ Unexpected Error: ${errorMessage}`)
      }
    }
  }

  const handleSectionChange = (section: string, checked: boolean) => {
    setNewQuiz((prev) => {
      const currentSections = Array.isArray(prev.sections) ? prev.sections : []
      return {
        ...prev,
        sections: checked
          ? [...currentSections, section]
          : currentSections.filter((s) => s !== section),
      }
    })
  }

  const handleEditQuiz = async (quiz: Quiz) => {
    setEditingQuiz(quiz)

    const quizChapterId = (quiz as any).chapterId || ""
    let subjectId = ""

    // If quiz has a chapter, get the subject ID from it
    if (quizChapterId) {
      try {
        const response = await fetch(`/api/chapters/${quizChapterId}`)
        if (response.ok) {
          const chapterData = await response.json()
          subjectId = chapterData.subjectId || ""
          if (subjectId) {
            await fetchChapters(subjectId)
          }
        }
      } catch (error) {
        console.error('Error loading chapter details:', error)
      }
    }

    setNewQuiz({
      title: quiz.title,
      description: quiz.description,
      duration: quiz.duration,
      subjectId,
      chapterId: quizChapterId,
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
          chapterId: newQuiz.chapterId || null,
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
        subjectId: "",
        chapterId: "",
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
      // Try to fetch from API first with cache busting
      const response = await fetch(`/api/admin/analytics?_t=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()
        const results = data.results || []
        const quizData = data.quizzes || []

        // Calculate comprehensive stats
        const totalUsers = new Set(results.map((r: any) => r.userId || r.user?.id || 'anonymous')).size || 1
        const totalAttempts = results.length
        const averageScore = results.length > 0 ?
          parseFloat((results.reduce((sum: number, r: any) => sum + (r.totalScore || 0), 0) / results.length).toFixed(2)) : 0

        const analyticsData = {
          totalUsers,
          totalAttempts,
          totalQuizzes: quizData.length,
          activeQuizzes: quizData.filter((q: any) => q.isActive !== false).length,
          // Calculate total questions by parsing JSON strings properly
          totalQuestions: quizData.reduce((sum: number, quiz: any) => {
            let questions = quiz.questions || [];
            if (typeof questions === 'string') {
              try {
                questions = JSON.parse(questions);
              } catch (e) {
                questions = [];
              }
            }
            return sum + (Array.isArray(questions) ? questions.length : 0);
          }, 0),
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
        // Calculate total questions by parsing JSON strings properly
        totalQuestions: quizzes.reduce((sum, quiz) => {
          let questions = quiz.questions || [];
          if (typeof questions === 'string') {
            try {
              questions = JSON.parse(questions);
            } catch (e) {
              questions = [];
            }
          }
          return sum + (Array.isArray(questions) ? questions.length : 0);
        }, 0),
        averageScore: localResults.length > 0 ?
          parseFloat((localResults.reduce((sum: number, r: any) => sum + (r.totalScore || 0), 0) / localResults.length).toFixed(2)) : 0,
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

  // Icon mapping function to render proper icons (client-side only to prevent hydration errors)
  const getSubjectIcon = (iconName: string) => {
    return <span className="text-2xl">📚</span>;
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
        <div className="flex flex-col gap-4 mb-8">
          {/* Mobile header - Clean title only */}
          <div className="sm:hidden">
            <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {user.name}
            </p>
          </div>

          {/* Desktop header */}
          <div className="hidden sm:flex sm:justify-between sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Panel</h1>
              <p className="text-muted-foreground">
                Welcome, {user.name} - Manage individual quizzes and their questions
              </p>
            </div>

            {/* Desktop: Only show role badge */}
            <Badge variant="outline" className="flex items-center gap-1 h-fit">
              <Shield className="h-3 w-3" />
              Administrator
            </Badge>
          </div>
        </div>

        <Tabs value={selectedAdminTab} onValueChange={setSelectedAdminTab} className="space-y-6">
          {/* Mobile: Dropdown selector */}
          <div className="md:hidden">
            <Select value={selectedAdminTab} onValueChange={setSelectedAdminTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">📊 Overview & Stats</SelectItem>
                <SelectItem value="quizzes">📝 Manage Quizzes</SelectItem>
                <SelectItem value="subjects">📚 Subjects & Chapters</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Desktop: Tab list */}
          <TabsList className="hidden md:grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">
              Overview & Stats
            </TabsTrigger>
            <TabsTrigger value="quizzes" className="text-xs sm:text-sm py-2">
              Manage Quizzes
            </TabsTrigger>
            <TabsTrigger value="subjects" className="text-xs sm:text-sm py-2">
              Subjects & Chapters
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
              <Card variant="neobrutalist">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">Total Users</span>
                    <span className="sm:hidden">Users</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black">{stats.totalUsers}</div>
                </CardContent>
              </Card>

              <Card variant="neobrutalist">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <BarChart3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Total Attempts</span>
                    <span className="sm:hidden">Attempts</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black">{stats.totalAttempts}</div>
                </CardContent>
              </Card>

              <Card variant="neobrutalist">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <BookOpen className="h-4 w-4" />
                    <span className="hidden sm:inline">Total Quizzes</span>
                    <span className="sm:hidden">Quizzes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black">{stats.totalQuizzes}</div>
                  <p className="text-xs text-muted-foreground font-medium">{stats.activeQuizzes} active</p>
                </CardContent>
              </Card>

              <Card variant="neobrutalist">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <FileText className="h-4 w-4" />
                    <span className="hidden sm:inline">Total Questions</span>
                    <span className="sm:hidden">Questions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black">{stats.totalQuestions}</div>
                  <p className="text-xs text-muted-foreground font-medium">
                    {stats.totalQuizzes > 0 ? Math.round(stats.totalQuestions / stats.totalQuizzes) : 0} avg per quiz
                  </p>
                </CardContent>
              </Card>

              <Card className="col-span-2 md:col-span-1" variant="neobrutalist">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-bold">
                    <Trophy className="h-4 w-4" />
                    <span className="hidden sm:inline">Average Score</span>
                    <span className="sm:hidden">Avg Score</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black">{stats.averageScore}%</div>
                  <p className="text-xs text-muted-foreground font-medium">across all attempts</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" variant="neobrutalist">
                <Link href="/admin/analytics">
                  <CardHeader className="text-center pb-2">
                    <BarChart3 className="h-8 w-8 md:h-12 md:w-12 mx-auto text-blue-600 mb-2" />
                    <CardTitle className="text-sm md:text-base font-bold">Advanced Analytics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-xs font-medium">Detailed performance insights and trends</CardDescription>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" variant="neobrutalist">
                <Link href="/admin/users">
                  <CardHeader className="text-center pb-2">
                    <Users className="h-8 w-8 md:h-12 md:w-12 mx-auto text-green-600 mb-2" />
                    <CardTitle className="text-sm md:text-base font-bold">User Management</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-xs font-medium">Manage user accounts and monitor activity</CardDescription>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" variant="neobrutalist">
                <Link href="/admin/question-bank">
                  <CardHeader className="text-center pb-2">
                    <BookOpen className="h-8 w-8 md:h-12 md:w-12 mx-auto text-purple-600 mb-2" />
                    <CardTitle className="text-sm md:text-base font-bold">Question Bank</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-xs font-medium">
                      Centralized question repository for all quizzes
                    </CardDescription>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" variant="neobrutalist">
                <Link href="/admin/announcements">
                  <CardHeader className="text-center pb-2">
                    <Megaphone className="h-8 w-8 md:h-12 md:w-12 mx-auto text-pink-600 mb-2" />
                    <CardTitle className="text-sm md:text-base font-bold">Announcements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center text-xs font-medium">
                      Create and manage announcements for users
                    </CardDescription>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" variant="neobrutalist">
                <CardHeader className="text-center pb-2">
                  <Clock className="h-8 w-8 md:h-12 md:w-12 mx-auto text-orange-600 mb-2" />
                  <CardTitle className="text-sm md:text-base font-bold">Scheduled Exams</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-xs font-medium">
                    Schedule and manage timed exams (Coming Soon)
                  </CardDescription>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            {analytics.recentActivity && analytics.recentActivity.length > 0 && (
              <Card variant="neobrutalist">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-bold">
                    <div className="p-2 rounded-lg bg-orange-400 border-2 border-black">
                      <Clock className="h-5 w-5 text-black" />
                    </div>
                    Recent Quiz Attempts
                  </CardTitle>
                  <CardDescription className="font-medium">Latest quiz submissions from users</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.recentActivity.map((activity: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 border-2 border-black dark:border-white rounded-lg bg-card shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]">
                        <div>
                          <div className="font-bold">{activity.quizName || 'Unknown Quiz'}</div>
                          <div className="text-sm text-muted-foreground font-medium">
                            Score: {activity.totalScore || 0}% • {new Date(activity.date || activity.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <Badge className={cn(
                          "border-2 border-black font-bold",
                          (activity.totalScore || 0) >= 80 ? "bg-green-400 text-black" :
                            (activity.totalScore || 0) >= 60 ? "bg-yellow-400 text-black" : "bg-red-400 text-black"
                        )}>
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

      {/* Quiz Form */}
      {showQuizForm && (
        <Card variant="neobrutalist">
          <CardHeader>
            <CardTitle className="font-bold">{editingQuiz ? "Edit Quiz" : "Create New Quiz"}</CardTitle>
            <CardDescription className="font-medium">
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

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject (Optional)</Label>
                <Select
                  value={newQuiz.subjectId || "none"}
                  onValueChange={handleSubjectChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Subject</SelectItem>
                    {loadingSubjects ? (
                      <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="chapter">Chapter <span className="text-red-500">*</span></Label>
                <Select
                  value={newQuiz.chapterId}
                  onValueChange={(value) => setNewQuiz(prev => ({ ...prev, chapterId: value }))}
                  disabled={!newQuiz.subjectId || loadingChapters}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a chapter" />
                  </SelectTrigger>
                  <SelectContent>
                    {loadingChapters ? (
                      <SelectItem value="loading" disabled>Loading chapters...</SelectItem>
                    ) : (
                      chapters.map((chapter) => (
                        <SelectItem key={chapter.id} value={chapter.id}>
                          {chapter.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {!newQuiz.subjectId && (
                  <p className="text-xs text-muted-foreground">
                    Select a subject first to choose a chapter
                  </p>
                )}
              </div>
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
                      checked={Array.isArray(newQuiz.sections) && newQuiz.sections.includes(section.id)}
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
              <Button onClick={editingQuiz ? handleUpdateQuiz : createQuiz} variant="neobrutalist">
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
                    subjectId: "",
                    chapterId: "",
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
            // Ensure sections is always an array
            const safeQuiz = {
              ...quiz,
              sections: Array.isArray(quiz.sections) ? quiz.sections :
                (typeof quiz.sections === 'string' ?
                  ((() => {
                    try { return JSON.parse(quiz.sections); } catch { return []; }
                  })()) : [])
            };
            setQuizzes((prev) => [...prev, safeQuiz])
            setShowAIQuizGenerator(false)
            setSuccess(`Successfully created AI quiz "${quiz.title}" with ${quiz.questions.length} questions!`)
          }}
          onClose={() => setShowAIQuizGenerator(false)}
        />
      )}

      <QuizManagementSection onEditQuiz={(quiz) => {
        setEditingQuiz(quiz);
        setShowQuizForm(true);
      }} />

      {/* Quizzes List */}
      <div className="grid md:grid-cols-1 gap-6">
        {quizzes.length === 0 ? (
          <Card variant="neobrutalist">
            <CardContent className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4 font-medium">No quizzes created yet</p>
              <Button onClick={() => setShowQuizForm(true)} variant="neobrutalist">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          quizzes.map((quiz) => (
            <Card key={quiz.id} className={quiz.isActive ? "" : "opacity-60"} variant="neobrutalist">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                      <span className="truncate">{quiz.title}</span>
                      <Badge variant={quiz.isActive ? "default" : "secondary"} className="self-start sm:self-auto">
                        {quiz.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-sm">{quiz.description}</CardDescription>
                  </div>
                  <div className="flex flex-row sm:flex-col gap-1 justify-end">
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
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Duration:</span>
                      <p className="font-medium flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {quiz.duration} min
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Questions:</span>
                      <p className="font-medium">{quiz.questions?.length || 0}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Negative:</span>
                      <p className="font-medium text-xs">
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
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(() => {
                        // Handle different section formats
                        if (!quiz.sections) {
                          return (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              No sections
                            </Badge>
                          )
                        }

                        // If sections is an array of strings
                        if (Array.isArray(quiz.sections) && quiz.sections.length > 0) {
                          return quiz.sections.map((section, index) => {
                            // Handle if section is a string
                            if (typeof section === 'string') {
                              return (
                                <Badge key={section} variant="outline" className="text-xs">
                                  {section}
                                </Badge>
                              )
                            }
                            // (Removed: object with name property case, only string[] supported)
                            // Fallback for unknown format
                            return (
                              <Badge key={index} variant="outline" className="text-xs">
                                Section {index + 1}
                              </Badge>
                            )
                          })
                        }

                        // Fallback for other formats
                        return (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            No sections
                          </Badge>
                        )
                      })()}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link href={`/admin/quiz/${quiz.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full justify-center">
                        <Eye className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Manage Questions ({quiz.questions?.length || 0})</span>
                        <span className="sm:hidden">Questions ({quiz.questions?.length || 0})</span>
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleQuizStatus(quiz.id)}
                      className="w-full sm:w-auto"
                    >
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

    {/* Subjects & Chapters Management Tab */}
    <TabsContent value="subjects">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <h2 className="text-xl sm:text-2xl font-bold">Subjects & Chapters Management</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={() => setShowSubjectForm(true)} className="w-full sm:w-auto" size="sm" variant="neobrutalist">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Subject</span>
              <span className="sm:hidden">New Subject</span>
            </Button>
            <Button onClick={() => setShowChapterForm(true)} className="w-full sm:w-auto" size="sm" variant="neobrutalist">
              <Plus className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Add Chapter</span>
              <span className="sm:hidden">New Chapter</span>
            </Button>
          </div>
        </div>

        {/* Subject Form */}
        {showSubjectForm && (
          <Card variant="neobrutalist">
            <CardHeader>
              <CardTitle className="font-bold">{editingSubject ? "Edit Subject" : "Create New Subject"}</CardTitle>
              <CardDescription className="font-medium">
                {editingSubject ? "Update subject details" : "Add a new subject for organizing quizzes"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subjectName">Subject Name *</Label>
                <Input
                  id="subjectName"
                  placeholder="e.g., Mathematics"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subjectDescription">Description</Label>
                <Textarea
                  id="subjectDescription"
                  placeholder="Brief description of this subject"
                  value={newSubject.description}
                  onChange={(e) => setNewSubject((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subjectIcon">Icon</Label>
                  <Select
                    value={newSubject.icon}
                    onValueChange={(value) => setNewSubject((prev) => ({ ...prev, icon: value }))}
                  >
                    <SelectTrigger>
                      <div className="flex items-center gap-2">
                        {getSubjectIcon(newSubject.icon || "")}
                        <span>Select Icon</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="📚">📚 Book</SelectItem>
                      <SelectItem value="🧠">🧠 Brain</SelectItem>
                      <SelectItem value="🔢">🔢 Numbers</SelectItem>
                      <SelectItem value="📝">📝 Writing</SelectItem>
                      <SelectItem value="🎨">🎨 Art</SelectItem>
                      <SelectItem value="🎵">🎵 Music</SelectItem>
                      <SelectItem value="BookOpen">📖 Book Open</SelectItem>
                      <SelectItem value="Brain">🧠 Brain Alt</SelectItem>
                      <SelectItem value="Hash">🔢 Hash</SelectItem>
                      <SelectItem value="Pencil">✏️ Pencil</SelectItem>
                      <SelectItem value="Palette">🎨 Palette</SelectItem>
                      <SelectItem value="Music">🎵 Music Alt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subjectColor">Color</Label>
                  <Select
                    value={newSubject.color}
                    onValueChange={(value) => setNewSubject((prev) => ({ ...prev, color: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="#3B82F6">🔵 Blue</SelectItem>
                      <SelectItem value="#F43F5E">🔴 Red</SelectItem>
                      <SelectItem value="#4ADE80">🟢 Green</SelectItem>
                      <SelectItem value="#FBBF24">🟡 Yellow</SelectItem>
                      <SelectItem value="#A855F7">🟣 Purple</SelectItem>
                      <SelectItem value="#000000">⚫ Black</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={async () => {
                  // Create or update subject
                  try {
                    const isEdit = editingSubject !== null
                    const url = isEdit
                      ? `/api/admin/subjects/${editingSubject.id}`
                      : "/api/admin/subjects"
                    const method = isEdit ? "PUT" : "POST"

                    const res = await fetch(url, {
                      method,
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
                      },
                      body: JSON.stringify(newSubject),
                    })
                    if (!res.ok) throw new Error(`Failed to ${isEdit ? 'update' : 'create'} subject`)

                    const data = await res.json()
                    // Refresh subjects list
                    await fetchSubjects()
                    setSuccess(`Subject ${isEdit ? 'updated' : 'created'} successfully!`)
                    setNewSubject({
                      name: "",
                      description: "",
                      icon: "📚",
                      color: "#3B82F6"
                    })
                    setEditingSubject(null)
                    setShowSubjectForm(false)
                  } catch (err) {
                    setError(`Failed to ${editingSubject ? 'update' : 'create'} subject`)
                  }
                }} variant="neobrutalist">
                  {editingSubject ? "Update Subject" : "Create Subject"}
                </Button>
                <Button
                  variant="neobrutalistInverted"
                  onClick={() => {
                    setShowSubjectForm(false)
                    setEditingSubject(null)
                    setNewSubject({
                      name: "",
                      description: "",
                      icon: "📚",
                      color: "#3B82F6"
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
        )
        }

        {/* Chapter Form */}
        {
          showChapterForm && (
            <Card variant="neobrutalist">
              <CardHeader>
                <CardTitle className="font-bold">{editingChapter ? "Edit Chapter" : "Create New Chapter"}</CardTitle>
                <CardDescription className="font-medium">
                  {editingChapter ? "Update chapter details" : "Add a new chapter under a subject"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="chapterName">Chapter Name *</Label>
                  <Input
                    id="chapterName"
                    placeholder="e.g., Algebra 101"
                    value={newChapter.name}
                    onChange={(e) => setNewChapter((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chapterDescription">Description</Label>
                  <Textarea
                    id="chapterDescription"
                    placeholder="Brief description of this chapter"
                    value={newChapter.description}
                    onChange={(e) => setNewChapter((prev) => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subjectSelect">Select Subject *</Label>
                  <Select
                    value={selectedSubjectForChapter}
                    onValueChange={(value) => setSelectedSubjectForChapter(value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.length === 0 ? (
                        <SelectItem value="none" disabled>No subjects available</SelectItem>
                      ) : (
                        subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex gap-2">
                  <Button onClick={async () => {
                    // Create or update chapter
                    try {
                      const isEdit = editingChapter !== null
                      const url = isEdit
                        ? `/api/admin/chapters/${editingChapter.id}`
                        : "/api/admin/chapters"
                      const method = isEdit ? "PUT" : "POST"

                      const res = await fetch(url, {
                        method,
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
                        },
                        body: JSON.stringify({
                          ...newChapter,
                          subjectId: selectedSubjectForChapter,
                        }),
                      })
                      if (!res.ok) throw new Error(`Failed to ${isEdit ? 'update' : 'create'} chapter`)

                      const data = await res.json()
                      // Refresh subjects list to get updated chapters
                      await fetchSubjects()
                      setSuccess(`Chapter ${isEdit ? 'updated' : 'created'} successfully!`)
                      setNewChapter({
                        name: "",
                        description: "",
                        subjectId: ""
                      })
                      setSelectedSubjectForChapter("")
                      setEditingChapter(null)
                      setShowChapterForm(false)
                    } catch (err) {
                      setError(`Failed to ${editingChapter ? 'update' : 'create'} chapter`)
                    }
                  }} variant="neobrutalist">
                    {editingChapter ? "Update Chapter" : "Create Chapter"}
                  </Button>
                  <Button
                    variant="neobrutalistInverted"
                    onClick={() => {
                      setShowChapterForm(false)
                      setEditingChapter(null)
                      setNewChapter({
                        name: "",
                        description: "",
                        subjectId: ""
                      })
                      setSelectedSubjectForChapter("")
                      setError("")
                      setSuccess("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        }

        {/* Subjects List */}
        <Card variant="neobrutalist">
          <CardHeader>
            <CardTitle className="font-bold">Subjects</CardTitle>
            <CardDescription className="font-medium">
              Manage subjects for organizing quizzes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {subjects.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4 font-medium">No subjects created yet</p>
                <Button onClick={() => setShowSubjectForm(true)} variant="neobrutalist">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Subject
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {subjects.map((subject) => (
                  <div key={subject.id} className="p-4 border-2 border-black rounded-lg shadow-[4px_4px_0px_0px_#000] bg-white mb-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {getSubjectIcon(subject.icon || "")}
                        <div>
                          <div className="font-medium">{subject.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {subject.description}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                          // Edit subject
                          setEditingSubject(subject)
                          setNewSubject({
                            name: subject.name,
                            description: subject.description,
                            icon: subject.icon || "📚",
                            color: subject.color || "#3B82F6"
                          })
                          setShowSubjectForm(true)
                        }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={async () => {
                          // Delete subject
                          if (confirm("Are you sure you want to delete this subject? All associated chapters will be removed.")) {
                            try {
                              setError("")
                              setSuccess("")
                              const res = await fetch(`/api/admin/subjects/${subject.id}?t=${Date.now()}`, {
                                method: "DELETE",
                                headers: {
                                  Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
                                  'Cache-Control': 'no-cache',
                                },
                              })

                              if (!res.ok) {
                                const errorData = await res.json()
                                throw new Error(errorData.message || "Failed to delete subject")
                              }

                              const data = await res.json()

                              // Refresh subjects list
                              await fetchSubjects()
                              setSuccess(data.message || "Subject deleted successfully!")
                            } catch (err) {
                              setError(err instanceof Error ? err.message : "Failed to delete subject")
                            }
                          }
                        }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Chapters under this subject */}
                    {subject.chapters && subject.chapters.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm text-muted-foreground mb-2">
                          Chapters ({subject.chapters.length})
                        </div>
                        <div className="space-y-2">
                          {subject.chapters.map((chapter) => (
                            <div key={chapter.id} className="flex justify-between items-center p-3 border-2 border-black rounded-lg bg-white shadow-[2px_2px_0px_0px_#000]">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{chapter.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {chapter.description}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="icon" onClick={() => {
                                  // Edit chapter
                                  setEditingChapter(chapter)
                                  setNewChapter({
                                    name: chapter.name,
                                    description: chapter.description,
                                    subjectId: chapter.subjectId
                                  })
                                  setSelectedSubjectForChapter(subject.id)
                                  setShowChapterForm(true)
                                }}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={async () => {
                                  // Delete chapter
                                  if (confirm("Are you sure you want to delete this chapter?")) {
                                    try {
                                      setError("")
                                      setSuccess("")
                                      const res = await fetch(`/api/admin/chapters/${chapter.id}?t=${Date.now()}`, {
                                        method: "DELETE",
                                        headers: {
                                          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
                                          'Cache-Control': 'no-cache',
                                        },
                                      })

                                      if (!res.ok) {
                                        const errorData = await res.json()
                                        throw new Error(errorData.message || "Failed to delete chapter")
                                      }

                                      const data = await res.json()

                                      // Refresh subjects list to get updated chapters
                                      await fetchSubjects()
                                      setSuccess(data.message || "Chapter deleted successfully!")
                                    } catch (err) {
                                      setError(err instanceof Error ? err.message : "Failed to delete chapter")
                                    }
                                  }
                                }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TabsContent>
  </Tabs>
</div>
</div>
  )
}
