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
import { Plus, Trash2, Users, BarChart3, Edit, Eye, Clock, BookOpen, LogOut, Shield } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

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
      // Load quizzes from localStorage
      setTimeout(() => {
        const savedQuizzes = JSON.parse(localStorage.getItem("adminQuizzes") || "[]")
        if (savedQuizzes.length === 0) {
          // Initialize with mock quizzes
          localStorage.setItem("adminQuizzes", JSON.stringify(mockQuizzes))
          setQuizzes(mockQuizzes)
        } else {
          setQuizzes(savedQuizzes)
        }
        setAdminLoading(false)
      }, 500)
    }
  }, [loading, user])

  const saveQuizzes = (updatedQuizzes: Quiz[]) => {
    localStorage.setItem("adminQuizzes", JSON.stringify(updatedQuizzes))
    setQuizzes(updatedQuizzes)
  }

  const handleSectionChange = (section: string, checked: boolean) => {
    setNewQuiz((prev) => ({
      ...prev,
      sections: checked ? [...prev.sections, section] : prev.sections.filter((s) => s !== section),
    }))
  }

  const handleCreateQuiz = () => {
    if (!newQuiz.title || newQuiz.sections.length === 0) {
      setError("Please provide a title and select at least one section")
      return
    }

    const quiz: Quiz = {
      id: Date.now().toString(),
      title: newQuiz.title,
      description: newQuiz.description,
      duration: newQuiz.duration,
      sections: newQuiz.sections,
      questions: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || "admin",
      negativeMarking: newQuiz.negativeMarking,
      negativeMarkValue: newQuiz.negativeMarkValue,
    }

    const updatedQuizzes = [...quizzes, quiz]
    saveQuizzes(updatedQuizzes)
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

  const handleUpdateQuiz = () => {
    if (!editingQuiz) return

    const updatedQuiz: Quiz = {
      ...editingQuiz,
      title: newQuiz.title,
      description: newQuiz.description,
      duration: newQuiz.duration,
      sections: newQuiz.sections,
    }

    const updatedQuizzes = quizzes.map((q) => (q.id === editingQuiz.id ? updatedQuiz : q))
    saveQuizzes(updatedQuizzes)
    setSuccess("Quiz updated successfully!")
    setEditingQuiz(null)
    setNewQuiz({
      title: "",
      description: "",
      duration: 30,
      sections: [],
      negativeMarking: true,
      negativeMarkValue: 0.25,
    })
    setShowQuizForm(false)
  }

  const handleDeleteQuiz = (quizId: string) => {
    if (!confirm("Are you sure you want to delete this quiz? All questions will be permanently removed.")) return

    const updatedQuizzes = quizzes.filter((q) => q.id !== quizId)
    saveQuizzes(updatedQuizzes)
    setSuccess("Quiz deleted successfully!")
  }

  const handleToggleQuizStatus = (quizId: string) => {
    const updatedQuizzes = quizzes.map((q) => (q.id === quizId ? { ...q, isActive: !q.isActive } : q))
    saveQuizzes(updatedQuizzes)
    setSuccess("Quiz status updated!")
  }

  const getQuizResults = () => {
    if (typeof window === "undefined") return [] // SSR/Build phase
    try {
      return JSON.parse(localStorage.getItem("quizResults") || "[]")
    } catch {
      return []
    }
  }

  const stats = {
    totalUsers: 1,
    totalAttempts: getQuizResults().length,
    totalQuizzes: quizzes.length,
    activeQuizzes: quizzes.filter((q) => q.isActive).length,
    totalQuestions: quizzes.reduce((sum, quiz) => sum + quiz.questions.length, 0),
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
                  <CardTitle>Average Questions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {stats.totalQuizzes > 0 ? Math.round(stats.totalQuestions / stats.totalQuizzes) : 0}
                  </div>
                  <p className="text-xs text-muted-foreground">per quiz</p>
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
                <CardHeader className="text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-purple-600 mb-2" />
                  <CardTitle>Question Bank</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    Centralized question repository (Coming Soon)
                  </CardDescription>
                </CardContent>
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
          </TabsContent>

          {/* Quizzes Management Tab */}
          <TabsContent value="quizzes">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Quiz Management</h2>
                <Button onClick={() => setShowQuizForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Quiz
                </Button>
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
                        <Label htmlFor="duration">Duration (minutes) *</Label>
                        <Select
                          value={newQuiz.duration.toString()}
                          onValueChange={(value) =>
                            setNewQuiz((prev) => ({ ...prev, duration: Number.parseInt(value) }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1.5 hours</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
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
                      <Button onClick={editingQuiz ? handleUpdateQuiz : handleCreateQuiz}>
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
                              <p className="font-medium">{quiz.questions.length}</p>
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
                                Manage Questions ({quiz.questions.length})
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
