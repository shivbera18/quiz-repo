"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, Plus, BookOpen, X } from "lucide-react"

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

interface QuestionBankImporterProps {
  isOpen: boolean
  onClose: () => void
  onImport: (questions: Omit<Question, 'id' | 'quizId' | 'createdAt'>[]) => void
  quizId: string
  userToken: string
  availableSections: string[]
}

const sections = ["Verbal Reasoning", "Quantitative Aptitude", "Logical Reasoning", "General Knowledge", "English"]
const difficulties = ["easy", "medium", "hard"]

export default function QuestionBankImporter({ 
  isOpen, 
  onClose, 
  onImport, 
  quizId, 
  userToken, 
  availableSections 
}: QuestionBankImporterProps) {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [filteredQuestions, setFilteredQuestions] = useState<QuestionBankItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set())
  
  // Filters
  const [selectedSection, setSelectedSection] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const questionsPerPage = 5

  useEffect(() => {
    if (isOpen) {
      fetchQuestions()
    }
  }, [isOpen])

  useEffect(() => {
    applyFilters()
  }, [questions, selectedSection, selectedDifficulty, searchQuery, selectedTags])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      setError("")
      
      const params = new URLSearchParams()
      if (selectedSection) params.append('section', selectedSection)
      if (selectedDifficulty) params.append('difficulty', selectedDifficulty)
      if (searchQuery) params.append('search', searchQuery)
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','))
      
      const res = await fetch(`/api/admin/question-bank?${params}`, {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      })
      
      if (!res.ok) {
        throw new Error(`Failed to fetch questions: ${res.status}`)
      }
      
      const data = await res.json()
      setQuestions(data.questions || [])
    } catch (err) {
      console.error("Error fetching questions:", err)
      setError("Failed to load questions from question bank")
      setQuestions([])
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...questions]
    
    if (selectedSection) {
      filtered = filtered.filter(q => q.section === selectedSection)
    }
    
    if (selectedDifficulty) {
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

  const toggleQuestionSelection = (questionId: string) => {
    const newSelected = new Set(selectedQuestions)
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId)
    } else {
      newSelected.add(questionId)
    }
    setSelectedQuestions(newSelected)
  }

  const selectAllFiltered = () => {
    const filteredIds = new Set(filteredQuestions.map(q => q.id))
    setSelectedQuestions(filteredIds)
  }

  const clearSelection = () => {
    setSelectedQuestions(new Set())
  }

  const handleImport = () => {
    const selectedQuestionObjects = questions.filter(q => selectedQuestions.has(q.id))
    const importQuestions = selectedQuestionObjects.map(q => ({
      section: q.section,
      question: q.question,
      options: [...q.options],
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
    }))
    
    onImport(importQuestions)
    setSelectedQuestions(new Set())
    onClose()
  }

  const handleClose = () => {
    setSelectedQuestions(new Set())
    setSelectedSection("")
    setSelectedDifficulty("")
    setSearchQuery("")
    setSelectedTags([])
    onClose()
  }

  // Get unique tags from all questions for filter options
  const allTags = Array.from(new Set(questions.flatMap(q => q.tags)))

  // Pagination logic
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage)
  const startIndex = (currentPage - 1) * questionsPerPage
  const paginatedQuestions = filteredQuestions.slice(startIndex, startIndex + questionsPerPage)

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Import from Question Bank
          </DialogTitle>
          <DialogDescription>
            Select questions from your question bank to add to this quiz.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold">{questions.length}</div>
              <div className="text-muted-foreground">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{filteredQuestions.length}</div>
              <div className="text-muted-foreground">Filtered</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{selectedQuestions.size}</div>
              <div className="text-muted-foreground">Selected</div>
            </div>
            <div className="text-center">
              <div className="font-semibold">{availableSections.length}</div>
              <div className="text-muted-foreground">Quiz Sections</div>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="All sections" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All sections</SelectItem>
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
                      <SelectItem value="">All difficulties</SelectItem>
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
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedSection("")
                    setSelectedDifficulty("")
                    setSearchQuery("")
                    setSelectedTags([])
                  }}
                >
                  Clear Filters
                </Button>
                <Button variant="outline" size="sm" onClick={fetchQuestions}>
                  Refresh
                </Button>
                <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                  Select All Filtered
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Questions List */}
          {loading ? (
            <div className="text-center py-8">Loading questions...</div>
          ) : paginatedQuestions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No questions found</h3>
                <p className="text-muted-foreground mb-4">
                  {questions.length === 0 
                    ? "Your question bank is empty. Add some questions first."
                    : "Try adjusting your filters or search criteria."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {paginatedQuestions.map((question, index) => (
                <Card key={question.id} className={selectedQuestions.has(question.id) ? "ring-2 ring-blue-500" : ""}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex items-start gap-3 flex-1">
                        <Checkbox
                          checked={selectedQuestions.has(question.id)}
                          onCheckedChange={() => toggleQuestionSelection(question.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{question.section}</Badge>
                            <Badge 
                              variant={
                                question.difficulty === 'easy' ? 'default' : 
                                question.difficulty === 'medium' ? 'secondary' : 'destructive'
                              }
                            >
                              {question.difficulty}
                            </Badge>
                            {question.tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <CardTitle className="text-base">
                            Q{startIndex + index + 1}. {question.question}
                          </CardTitle>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {question.options.map((option, optIndex) => (
                          <div 
                            key={optIndex} 
                            className={`p-2 rounded border text-sm ${
                              optIndex === question.correctAnswer 
                                ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                                : 'bg-muted'
                            }`}
                          >
                            <span className="font-medium">
                              {String.fromCharCode(65 + optIndex)}. 
                            </span>
                            {option}
                            {optIndex === question.correctAnswer && (
                              <Badge variant="default" className="ml-2 text-xs">Correct</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {question.explanation && (
                        <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                          <Label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                            Explanation:
                          </Label>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            {question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageNum
                      if (totalPages <= 3) {
                        pageNum = i + 1
                      } else if (currentPage <= 2) {
                        pageNum = i + 1
                      } else if (currentPage >= totalPages - 1) {
                        pageNum = totalPages - 2 + i
                      } else {
                        pageNum = currentPage - 1 + i
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
              
              <div className="text-center text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(startIndex + questionsPerPage, filteredQuestions.length)} of {filteredQuestions.length} questions
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedQuestions.size} question{selectedQuestions.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport}
              disabled={selectedQuestions.size === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Import {selectedQuestions.size} Question{selectedQuestions.size !== 1 ? 's' : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
