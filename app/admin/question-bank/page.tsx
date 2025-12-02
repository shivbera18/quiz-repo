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
import { AdminBreadcrumb } from "@/components/ui/admin-breadcrumb"

import { Plus, Trash2, Edit, Search, BookOpen, Save, X, Sparkles } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import AIQuestionGenerator from "./ai-generator"
import MathRenderer from "@/components/math-renderer"

interface QuestionBankItem {
  id: string
  section: string
  question: string
  options: string[]
  correctAnswer: number
  explanation?: string
  difficulty: 'easy' | 'medium' | 'hard'
  tags: string[]
  createdAt: string
  updatedAt: string
}

const sections = ["Verbal Reasoning", "Quantitative Aptitude", "Logical Reasoning", "General Knowledge", "English"]
const difficulties = ["easy", "medium", "hard"]

export default function QuestionBankPage() {  const { user, loading, logout } = useAuth(true) // Require admin access
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<QuestionBankItem[]>([])
  const [adminLoading, setAdminLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null)
  const [showAIGenerator, setShowAIGenerator] = useState(false)
    // Filters
  const [selectedSection, setSelectedSection] = useState("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  // Form state
  const [newQuestion, setNewQuestion] = useState<{
    section: string
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
    difficulty: 'easy' | 'medium' | 'hard'
    tags: string[]
  }>({
    section: "",
    question: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: "",
    difficulty: "medium",
    tags: [],
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const questionsPerPage = 10

  useEffect(() => {
    if (user) {
      fetchQuestions()
    }
  }, [user])

  useEffect(() => {
    applyFilters()
  }, [questions, selectedSection, selectedDifficulty, searchQuery, selectedTags])
  const fetchQuestions = async () => {
    try {
      setAdminLoading(true)
      setError("")
      
      const params = new URLSearchParams()
      if (selectedSection && selectedSection !== "all") params.append('section', selectedSection)
      if (selectedDifficulty && selectedDifficulty !== "all") params.append('difficulty', selectedDifficulty)
      if (searchQuery) params.append('search', searchQuery)
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))
      
      const res = await fetch(`/api/admin/question-bank?${params}`, {
        headers: {
          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
        },
      })
      
      if (!res.ok) {
        throw new Error(`Failed to fetch questions: ${res.status}`)
      }
      
      const data = await res.json()
      setQuestions(data.questions || [])
    } catch (err) {
      console.error("Error fetching questions:", err)
      setError("Failed to load questions from database")
      setQuestions([])
    } finally {
      setAdminLoading(false)
    }
  }
  const applyFilters = () => {
    let filtered = [...questions]
    
    if (selectedSection && selectedSection !== "all") {
      filtered = filtered.filter(q => q.section === selectedSection)
    }
    
    if (selectedDifficulty && selectedDifficulty !== "all") {
      filtered = filtered.filter(q => q.difficulty === selectedDifficulty)
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(q => 
        q.question.toLowerCase().includes(query) ||
        q.explanation?.toLowerCase().includes(query) ||
        q.tags.some(tag => tag.toLowerCase().includes(query))
      )
    }
    
    if (selectedTags.length > 0) {
      filtered = filtered.filter(q => 
        selectedTags.some(tag => q.tags.includes(tag))
      )
    }
    
    setFilteredQuestions(filtered)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handleCreateQuestion = async () => {
    if (!newQuestion.question.trim() || !newQuestion.section || 
        newQuestion.options.some(opt => !opt.trim())) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setError("")
      setSuccess("")
      
      const res = await fetch("/api/admin/question-bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
        },
        body: JSON.stringify(newQuestion),
      })
      
      if (!res.ok) {
        throw new Error("Failed to create question")
      }
      
      const data = await res.json()
      setQuestions(prev => [data.question, ...prev])
      setSuccess("Question created successfully!")
      resetForm()
    } catch (err) {
      setError("Failed to create question")
    }
  }

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return

    try {
      setError("")
      setSuccess("")
      
      const res = await fetch(`/api/admin/question-bank/${editingQuestion.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
        },
        body: JSON.stringify(newQuestion),
      })
      
      if (!res.ok) {
        throw new Error("Failed to update question")
      }
      
      const data = await res.json()
      setQuestions(prev => prev.map(q => q.id === editingQuestion.id ? data.question : q))
      setSuccess("Question updated successfully!")
      resetForm()
    } catch (err) {
      setError("Failed to update question")
    }
  }

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return

    try {
      setError("")
      setSuccess("")
      
      const res = await fetch(`/api/admin/question-bank/${questionId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
        },
      })
      
      if (!res.ok) {
        throw new Error("Failed to delete question")
      }
      
      setQuestions(prev => prev.filter(q => q.id !== questionId))
      setSuccess("Question deleted successfully!")
    } catch (err) {
      setError("Failed to delete question")
    }
  }

  const handleEditQuestion = (question: QuestionBankItem) => {
    setEditingQuestion(question)
    setNewQuestion({
      section: question.section,
      question: question.question,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || "",
      difficulty: question.difficulty,
      tags: [...question.tags],
    })
    setShowQuestionForm(true)
  }

  const resetForm = () => {
    setNewQuestion({
      section: "",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: "",
      difficulty: "medium",
      tags: [],
    })
    setEditingQuestion(null)
    setShowQuestionForm(false)
  }

  const handleTagInput = (value: string) => {
    if (value.includes(',')) {
      const newTags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      const updatedTags = [...new Set([...newQuestion.tags, ...newTags])]
      setNewQuestion(prev => ({ ...prev, tags: updatedTags }))
    }
  }
  const removeTag = (tagToRemove: string) => {
    setNewQuestion(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleAIGenerate = async (generatedQuestions: any[]) => {
    try {
      setError("")
      setSuccess("")
      
      console.log('handleAIGenerate called with questions:', generatedQuestions.length)
      console.log('Sample question data:', generatedQuestions[0])
      
      // Save all generated questions to the database
      const savedQuestions = []
      for (const questionData of generatedQuestions) {
        console.log('Saving question:', questionData.question.substring(0, 50) + '...')
        
        const res = await fetch('/api/admin/question-bank', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user?.token || "admin-token-placeholder"}`,
          },
          body: JSON.stringify(questionData)
        })
        
        console.log('Save response status:', res.status)
        
        if (res.ok) {
          const saved = await res.json()
          console.log('Question saved successfully:', saved.question?.id)
          savedQuestions.push(saved.question)
        } else {
          const errorText = await res.text()
          console.error('Failed to save question:', res.status, errorText)
        }
      }
      
      console.log('Total questions saved:', savedQuestions.length)
      
      if (savedQuestions.length > 0) {
        setQuestions(prev => [...savedQuestions, ...prev])
        setSuccess(`Successfully added ${savedQuestions.length} AI-generated question${savedQuestions.length !== 1 ? 's' : ''}!`)
        console.log('Success message set')
      } else {
        setError("Failed to save generated questions")
        console.log('Error: No questions saved')
      }
    } catch (err) {
      console.error('Error saving AI questions:', err)
      setError("Failed to save AI-generated questions")
    }
  }

  // Get unique tags from all questions for filter options
  const allTags = Array.from(new Set(questions.flatMap(q => q.tags)))

  // Pagination logic
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage)
  const startIndex = (currentPage - 1) * questionsPerPage
  const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + questionsPerPage)

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center mobile-header-safe-zone">
        <div className="text-center">Loading question bank...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center mobile-header-safe-zone">
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
    <div className="min-h-screen bg-background mobile-header-safe-zone">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-400 border-2 border-black">
                <BookOpen className="h-6 w-6 text-black" />
              </div>
              Question Bank
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base font-medium">
              Centralized repository for all quiz questions
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
          <Card variant="neobrutalist">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-bold">Total Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-black">{questions.length}</div>
            </CardContent>
          </Card>
          <Card variant="neobrutalist">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-bold">Filtered Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-black">{filteredQuestions.length}</div>
            </CardContent>
          </Card>
          <Card variant="neobrutalist">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-bold">Sections</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-black">
                {new Set(questions.map(q => q.section)).size}
              </div>
            </CardContent>
          </Card>
          <Card variant="neobrutalist">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-bold">Total Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-black">{allTags.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="space-y-4 mb-6">          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black">Questions</h2>
            <div className="flex gap-2">
              <Button 
                variant="neobrutalist" 
                onClick={() => setShowAIGenerator(true)}
                className="bg-gradient-to-r from-purple-400 to-blue-400"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
              <Button variant="neobrutalist" onClick={() => setShowQuestionForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card variant="neobrutalist">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Filters & Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-4 gap-4">                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="All sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sections</SelectItem>
                      {sections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                    <SelectTrigger>
                      <SelectValue placeholder="All difficulties" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All difficulties</SelectItem>
                      {difficulties.map(difficulty => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search questions..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <Select 
                    value={selectedTags.length > 0 ? selectedTags[0] : ""} 
                    onValueChange={(value) => {
                      if (value && !selectedTags.includes(value)) {
                        setSelectedTags(prev => [...prev, value])
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tags" />
                    </SelectTrigger>
                    <SelectContent>
                      {allTags.map(tag => (
                        <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selected tags */}
              {selectedTags.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Tags:</Label>
                  <div className="flex gap-2 flex-wrap">
                    {selectedTags.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0"
                          onClick={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedSection("all")
                    setSelectedDifficulty("all")
                    setSearchQuery("")
                    setSelectedTags([])
                  }}
                  className="border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.4)] transition-all"
                >
                  Clear Filters
                </Button>
                <Button variant="neobrutalist" onClick={fetchQuestions}>
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alert Messages */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Question Form */}
        {showQuestionForm && (
          <Card variant="neobrutalist" className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="font-bold">{editingQuestion ? "Edit Question" : "Add New Question"}</CardTitle>
                <Button variant="ghost" size="icon" onClick={resetForm} className="border-2 border-black dark:border-white">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section *</Label>
                  <Select 
                    value={newQuestion.section} 
                    onValueChange={(value) => setNewQuestion(prev => ({ ...prev, section: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty *</Label>
                  <Select 
                    value={newQuestion.difficulty} 
                    onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                      setNewQuestion(prev => ({ ...prev, difficulty: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {difficulties.map(difficulty => (
                        <SelectItem key={difficulty} value={difficulty}>
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question *</Label>
                <Textarea
                  placeholder="Enter the question text..."
                  value={newQuestion.question}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Options *</Label>
                <div className="space-y-2">
                  {newQuestion.options.map((option, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={newQuestion.correctAnswer === index}
                          onChange={() => setNewQuestion(prev => ({ ...prev, correctAnswer: index }))}
                        />
                        <Label className="text-sm font-medium">
                          {String.fromCharCode(65 + index)}.
                        </Label>
                      </div>
                      <Input
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newQuestion.options]
                          newOptions[index] = e.target.value
                          setNewQuestion(prev => ({ ...prev, options: newOptions }))
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Explanation</Label>
                <Textarea
                  placeholder="Optional explanation for the correct answer..."
                  value={newQuestion.explanation}
                  onChange={(e) => setNewQuestion(prev => ({ ...prev, explanation: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <Input
                  placeholder="Enter tags separated by commas (e.g., algebra, basic, practice)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      handleTagInput(e.currentTarget.value)
                      e.currentTarget.value = ''
                    }
                  }}
                  onBlur={(e) => {
                    handleTagInput(e.currentTarget.value)
                    e.currentTarget.value = ''
                  }}
                />
                {newQuestion.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {newQuestion.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 p-0"
                          onClick={() => removeTag(tag)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="neobrutalist" onClick={editingQuestion ? handleUpdateQuestion : handleCreateQuestion}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingQuestion ? "Update Question" : "Create Question"}
                </Button>
                <Button variant="outline" onClick={resetForm} className="border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.4)] transition-all">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Questions List */}
        <div className="space-y-4">
          {paginatedQuestions.length === 0 ? (
            <Card variant="neobrutalist">
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold mb-2">No questions found</h3>
                <p className="text-muted-foreground mb-4 font-medium">
                  {questions.length === 0 
                    ? "Start building your question bank by adding the first question."
                    : "Try adjusting your filters or search criteria."
                  }
                </p>
                <Button variant="neobrutalist" onClick={() => setShowQuestionForm(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Question
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {paginatedQuestions.map((question, index) => (
                <Card key={question.id} variant="neobrutalist">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge className="border-2 border-black bg-purple-400 text-black font-bold">{question.section}</Badge>
                          <Badge 
                            className={`border-2 border-black font-bold ${
                              question.difficulty === 'easy' ? 'bg-green-400 text-black' : 
                              question.difficulty === 'medium' ? 'bg-yellow-400 text-black' : 'bg-red-400 text-black'
                            }`}
                          >
                            {question.difficulty}
                          </Badge>
                          {question.tags.map(tag => (
                            <Badge key={tag} className="text-xs border-2 border-black bg-blue-400 text-black font-bold">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <CardTitle className="text-base font-bold">
                          Q{startIndex + index + 1}. <MathRenderer text={question.question} />
                        </CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleEditQuestion(question)}
                          title="Edit Question"
                          className="border-2 border-black dark:border-white"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteQuestion(question.id)}
                          title="Delete Question"
                          className="border-2 border-black dark:border-white text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {question.options.map((option, optIndex) => (
                          <div 
                            key={optIndex} 
                            className={`p-2 rounded-lg border-2 border-black dark:border-white ${
                              optIndex === question.correctAnswer 
                                ? 'bg-green-400' 
                                : 'bg-card'
                            }`}
                          >
                            <span className="font-bold">
                              {String.fromCharCode(65 + optIndex)}. 
                            </span>
                            <MathRenderer text={option} />
                            {optIndex === question.correctAnswer && (
                              <Badge className="ml-2 text-xs border-2 border-black bg-white text-black font-bold">Correct</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {question.explanation && (
                        <div className="p-3 bg-blue-400 rounded-lg border-2 border-black">
                          <Label className="text-sm font-bold text-black">
                            Explanation:
                          </Label>
                          <p className="text-sm text-black mt-1 font-medium">
                            <MathRenderer text={question.explanation} />
                          </p>
                        </div>
                      )}
                      
                      <div className="text-xs text-muted-foreground font-medium">
                        Created: {new Date(question.createdAt).toLocaleDateString()} | 
                        Updated: {new Date(question.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.4)] transition-all disabled:opacity-50"
                  >
                    Previous
                  </Button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 5) {
                        pageNum = i + 1
                      } else if (currentPage <= 3) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i
                      } else {
                        pageNum = currentPage - 2 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "neobrutalist" : "outline"}
                          size="icon"
                          onClick={() => setCurrentPage(pageNum)}
                          className={currentPage !== pageNum ? "border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)]" : ""}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.3)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.4)] transition-all disabled:opacity-50"
                  >
                    Next
                  </Button>
                </div>
              )}
              
              <div className="text-center text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + questionsPerPage, filteredQuestions.length)} of {filteredQuestions.length} questions
              </div>
            </>          )}
        </div>

        {/* AI Question Generator */}
        <AIQuestionGenerator
          isOpen={showAIGenerator}
          onClose={() => setShowAIGenerator(false)}
          onGenerate={handleAIGenerate}
          userToken={user?.token || "admin-token-placeholder"}
          availableSections={sections}
        />
      </div>
    </div>
  )
}
