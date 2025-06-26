"use client"
import { useEffect, useState } from "react"
import type React from "react"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowLeft, Plus, Trash2, Edit, Save, X, Clock, BookOpen, Upload, ImageIcon, Download } from "lucide-react"
import Link from "next/link"
import BulkManager from "./bulk-manager"
import QuestionBankImporter from "./question-bank-importer"
import { useAuth } from "@/hooks/use-auth"
import MathRenderer from "@/components/math-renderer"

interface Quiz {
  id: string
  title: string
  description: string
  duration: number
  sections: string[]
  questions: Question[]
  isActive: boolean
  createdAt: string
  createdBy: string
}

interface Question {
  id: string
  quizId: string
  section: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  image?: string
  createdAt: string
}

export default function QuizManagementPage({ params }: { params: { id: string } }) {
  const { user, loading } = useAuth(true) // Require admin access
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [quizLoading, setQuizLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)
  const router = useRouter()

  const [showBulkManager, setShowBulkManager] = useState(false)
  const [showQuestionBankImporter, setShowQuestionBankImporter] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState("")
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("")

  const [newQuestion, setNewQuestion] = useState({
    section: "",
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
    image: "",
  })

  const [showBulkUpload, setShowBulkUpload] = useState(false)

  useEffect(() => {
    if (!loading && user) {
      // Fetch quiz from backend API
      const fetchQuiz = async () => {
        try {
          const res = await fetch(`/api/admin/quizzes/${params.id}`, {
            headers: {
              Authorization: `Bearer ${user.token || "admin-token-placeholder"}`,
            },
          })
          if (!res.ok) throw new Error("Quiz not found or unauthorized")
          const data = await res.json()
          setQuiz(data.quiz)
        } catch (err) {
          setError("Quiz not found or unauthorized")
        } finally {
          setQuizLoading(false)
        }
      }
      fetchQuiz()
    }
  }, [params.id, loading, user])

  // Save quiz to backend
  const saveQuiz = async (updatedQuiz: Quiz) => {
    try {
      setError("")
      setSuccess("")
      if (!user) throw new Error("No user")
      const res = await fetch(`/api/admin/quizzes/${updatedQuiz.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token || "admin-token-placeholder"}`,
        },
        body: JSON.stringify({
          title: updatedQuiz.title,
          description: updatedQuiz.description,
          duration: updatedQuiz.duration,
          sections: updatedQuiz.sections,
          questions: updatedQuiz.questions,
          isActive: updatedQuiz.isActive,
        }),
      })
      if (!res.ok) throw new Error("Failed to save quiz")
      const data = await res.json()
      setQuiz(data.quiz)
      setSuccess("Quiz saved to database!")
    } catch (err) {
      setError("Failed to save quiz to database")
    }
  }

  // Adapter for BulkManager: expects sync function
  const saveQuizSync = (updatedQuiz: Quiz) => {
    saveQuiz(updatedQuiz)
  }

  const handleOptionChange = (index: number, value: string) => {
    const updatedOptions = [...newQuestion.options]
    updatedOptions[index] = value
    setNewQuestion((prev) => ({ ...prev, options: updatedOptions }))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleBulkUpload = async () => {
    if (!uploadFile || !quiz) return

    try {
      setUploadError("")
      const text = await uploadFile.text()
      const questionsData = JSON.parse(text)

      if (!Array.isArray(questionsData)) {
        setUploadError("Invalid JSON format. Expected an array of questions.")
        return
      }

      const validQuestions = []
      for (const [index, questionData] of questionsData.entries()) {
        // Validate question structure
        if (
          !questionData.section ||
          !questionData.question ||
          !Array.isArray(questionData.options) ||
          questionData.options.length !== 4 ||
          typeof questionData.correctAnswer !== "number" ||
          questionData.correctAnswer < 0 ||
          questionData.correctAnswer > 3
        ) {
          setUploadError(`Invalid question format at index ${index}. Please check the JSON structure.`)
          return
        }

        // Validate section exists in quiz
        if (!quiz.sections.includes(questionData.section)) {
          setUploadError(
            `Invalid section "${questionData.section}" at index ${index}. Available sections: ${quiz.sections.join(", ")}`,
          )
          return
        }

        const question: Question = {
          id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          quizId: quiz.id,
          section: questionData.section,
          question: questionData.question,
          options: questionData.options,
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation || "",
          image: questionData.image || "",
          createdAt: new Date().toISOString(),
        }
        validQuestions.push(question)
      }

      const updatedQuiz = {
        ...quiz,
        questions: [...quiz.questions, ...validQuestions],
      }

      saveQuiz(updatedQuiz)
      setSuccess(`Successfully uploaded ${validQuestions.length} questions!`)
      setShowBulkUpload(false)
      setUploadFile(null)
      setUploadError("")
    } catch (error) {
      setUploadError("Invalid JSON file. Please check the format and try again.")
    }
  }

  const downloadSampleJSON = () => {
    const sampleQuestions = [
      {
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
        image: "", // Optional: URL or base64 string
      },
      {
        section: "quantitative",
        question: "What is 15% of 240?",
        options: ["36", "35", "38", "40"],
        correctAnswer: 0,
        explanation: "15% of 240 = (15/100) × 240 = 0.15 × 240 = 36",
      },
    ]

    const blob = new Blob([JSON.stringify(sampleQuestions, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "sample-questions.json"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleAddQuestion = () => {
    if (!quiz) return

    if (!newQuestion.section || !newQuestion.question || newQuestion.options.some((opt) => !opt.trim())) {
      setError("Please fill in all fields")
      return
    }

    let imageData = ""
    if (selectedImage) {
      // In a real app, you'd upload to a server. For demo, we'll use base64
      const reader = new FileReader()
      reader.onload = (e) => {
        imageData = e.target?.result as string

        const question = {
          id: Date.now().toString(),
          quizId: quiz.id,
          section: newQuestion.section,
          question: newQuestion.question,
          options: newQuestion.options,
          correctAnswer: newQuestion.correctAnswer,
          explanation: newQuestion.explanation,
          image: imageData,
          createdAt: new Date().toISOString(),
        }

        const updatedQuiz = {
          ...quiz,
          questions: [...quiz.questions, question],
        }

        saveQuiz(updatedQuiz)
        setSuccess("Question added successfully!")
        resetForm()
      }
      reader.readAsDataURL(selectedImage)
    } else {
      const question = {
        id: Date.now().toString(),
        quizId: quiz.id,
        section: newQuestion.section,
        question: newQuestion.question,
        options: newQuestion.options,
        correctAnswer: newQuestion.correctAnswer,
        explanation: newQuestion.explanation,
        image: "",
        createdAt: new Date().toISOString(),
      }

      const updatedQuiz = {
        ...quiz,
        questions: [...quiz.questions, question],
      }

      saveQuiz(updatedQuiz)
      setSuccess("Question added successfully!")
      resetForm()
    }
  }

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question)
    setNewQuestion({
      section: question.section,
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || "",
      image: question.image || "",
    })
    setImagePreview(question.image || "")
    setSelectedImage(null) // Reset selected image
    setShowQuestionForm(true)
  }

  const handleUpdateQuestion = () => {
    if (!quiz || !editingQuestion) return

    if (!newQuestion.section || !newQuestion.question || newQuestion.options.some((opt) => !opt.trim())) {
      setError("Please fill in all fields")
      return
    }

    // Handle image update
    if (selectedImage) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string

        const updatedQuestion: Question = {
          ...editingQuestion,
          section: newQuestion.section,
          question: newQuestion.question,
          options: newQuestion.options,
          correctAnswer: newQuestion.correctAnswer,
          explanation: newQuestion.explanation,
          image: imageData,
        }

        const updatedQuiz = {
          ...quiz,
          questions: quiz.questions.map((q) => (q.id === editingQuestion.id ? updatedQuestion : q)),
        }

        saveQuiz(updatedQuiz)
        setSuccess("Question updated successfully!")
        resetForm()
      }
      reader.readAsDataURL(selectedImage)
    } else {
      // Update without changing image
      const updatedQuestion: Question = {
        ...editingQuestion,
        section: newQuestion.section,
        question: newQuestion.question,
        options: newQuestion.options,
        correctAnswer: newQuestion.correctAnswer,
        explanation: newQuestion.explanation,
        image: imagePreview || editingQuestion.image || "",
      }

      const updatedQuiz = {
        ...quiz,
        questions: quiz.questions.map((q) => (q.id === editingQuestion.id ? updatedQuestion : q)),
      }

      saveQuiz(updatedQuiz)
      setSuccess("Question updated successfully!")
      resetForm()
    }
  }

  const handleDeleteQuestion = (questionId: string) => {
    if (!quiz) return
    if (!confirm("Are you sure you want to delete this question?")) return

    const updatedQuiz = {
      ...quiz,
      questions: quiz.questions.filter((q) => q.id !== questionId),
    }

    saveQuiz(updatedQuiz)
    setSuccess("Question deleted successfully!")
  }

  const resetForm = () => {
    setShowQuestionForm(false)
    setEditingQuestion(null)
    setNewQuestion({
      section: "",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
      image: "",
    })
    setSelectedImage(null)
    setImagePreview("")
    setError("")
    setSuccess("")
  }

  const handleImportFromQuestionBank = (importedQuestions: Omit<Question, 'id' | 'quizId' | 'createdAt'>[]) => {
    if (!quiz) return

    const newQuestions: Question[] = importedQuestions.map((q, index) => ({
      id: `imported-${Date.now()}-${index}`,
      quizId: quiz.id,
      createdAt: new Date().toISOString(),
      ...q,
    }))

    const updatedQuiz = {
      ...quiz,
      questions: [...quiz.questions, ...newQuestions],
    }

    saveQuiz(updatedQuiz)
    setSuccess(`${newQuestions.length} question${newQuestions.length !== 1 ? 's' : ''} imported successfully!`)
  }

  if (loading || quizLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading quiz...</div>
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

  if (!quiz) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Quiz not found</p>
          <Link href="/admin">
            <Button>Back to Admin Panel</Button>
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
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{quiz.title}</h1>
              <p className="text-muted-foreground">Manage questions for this quiz</p>
            </div>
          </div>
          <div className="flex gap-2">
            <ThemeToggle />
            <Button variant="outline" onClick={() => setShowQuestionBankImporter(true)}>
              <Download className="h-4 w-4 mr-2" />
              Import from Bank
            </Button>
            <Button variant="outline" onClick={() => setShowBulkManager(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Manager
            </Button>
            <Button onClick={() => setShowQuestionForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question
            </Button>
          </div>
        </div>

        {/* Quiz Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Quiz Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <span className="text-muted-foreground text-sm">Duration:</span>
                <p className="font-medium flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {quiz.duration} minutes
                </p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Total Questions:</span>
                <p className="font-medium">{quiz.questions.length}</p>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Status:</span>
                <Badge variant={quiz.isActive ? "default" : "secondary"}>{quiz.isActive ? "Active" : "Inactive"}</Badge>
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
            </div>
            {quiz.description && (
              <div className="mt-4">
                <span className="text-muted-foreground text-sm">Description:</span>
                <p className="text-sm mt-1">{quiz.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {showBulkManager && (
          <div className="mb-6">
            <BulkManager quiz={quiz} onQuizUpdate={saveQuizSync} onClose={() => setShowBulkManager(false)} />
          </div>
        )}

        {/* Question Form */}
        {showQuestionForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{editingQuestion ? "Edit Question" : "Add New Question"}</span>
                <Button variant="ghost" size="icon" onClick={resetForm}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
              <CardDescription>
                {editingQuestion ? "Update question details" : "Add a new question to this quiz"}
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

              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Select
                  value={newQuestion.section}
                  onValueChange={(value) => setNewQuestion((prev) => ({ ...prev, section: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {quiz.sections.map((section) => (
                      <SelectItem key={section} value={section}>
                        {section.charAt(0).toUpperCase() + section.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="question">Question</Label>
                <Textarea
                  id="question"
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion((prev) => ({ ...prev, question: e.target.value }))}
                  placeholder="Enter the question..."
                  required
                />
              </div>

              <div className="space-y-4">
                <Label>Options</Label>
                {newQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Label className="w-16">Option {index + 1}:</Label>
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Enter option ${index + 1}...`}
                      required
                    />
                    <Button
                      type="button"
                      variant={newQuestion.correctAnswer === index ? "default" : "outline"}
                      size="sm"
                      onClick={() => setNewQuestion((prev) => ({ ...prev, correctAnswer: index }))}
                    >
                      {newQuestion.correctAnswer === index ? "Correct" : "Mark Correct"}
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="explanation">Explanation (Optional)</Label>
                <Textarea
                  id="explanation"
                  value={newQuestion.explanation}
                  onChange={(e) => setNewQuestion((prev) => ({ ...prev, explanation: e.target.value }))}
                  placeholder="Explain why this answer is correct..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="questionImage">Question Image (Optional)</Label>
                <Input id="questionImage" type="file" accept="image/*" onChange={handleImageUpload} />
                {imagePreview && (
                  <div className="mt-2">
                    <img
                      src={imagePreview || "/placeholder.svg"}
                      alt="Question preview"
                      className="max-w-xs rounded border"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button onClick={editingQuestion ? handleUpdateQuestion : handleAddQuestion}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingQuestion ? "Update Question" : "Add Question"}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions List */}
        <Card>
          <CardHeader>
            <CardTitle>Questions ({quiz.questions.length})</CardTitle>
            <CardDescription>All questions for this quiz</CardDescription>
          </CardHeader>
          <CardContent>
            {quiz.questions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">No questions added yet</p>
                <Button onClick={() => setShowQuestionForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Question
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {quiz.questions.map((question, index) => (
                  <div key={question.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{question.section}</Badge>
                          <span className="text-sm text-muted-foreground">Question {index + 1}</span>
                          {question.image && <ImageIcon className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <p className="font-medium mb-2">
                          <MathRenderer text={question.question} />
                        </p>
                        {question.image && (
                          <div className="mb-2">
                            <img
                              src={question.image || "/placeholder.svg"}
                              alt="Question"
                              className="max-w-sm rounded border"
                            />
                          </div>
                        )}
                        <div className="space-y-1 mb-2">
                          {question.options.map((option, optionIndex) => (
                            <div
                              key={optionIndex}
                              className={`text-sm p-2 rounded ${
                                optionIndex === question.correctAnswer
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : "bg-muted"
                              }`}
                            >
                              {optionIndex + 1}. {option}
                              {optionIndex === question.correctAnswer && (
                                <Badge variant="default" className="ml-2 text-xs">
                                  Correct
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                        {question.explanation && (
                          <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                            <strong>Explanation:</strong> {question.explanation}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button variant="ghost" size="icon" onClick={() => handleEditQuestion(question)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteQuestion(question.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Question Bank Importer */}
        {showQuestionBankImporter && (
          <QuestionBankImporter
            isOpen={showQuestionBankImporter}
            onClose={() => setShowQuestionBankImporter(false)}
            onImport={handleImportFromQuestionBank}
            quizId={quiz.id}
            userToken={user?.token || "admin-token-placeholder"}
            availableSections={quiz.sections}
          />
        )}
      </div>
    </div>
  )
}
