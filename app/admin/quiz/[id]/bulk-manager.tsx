"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Download, Trash2, Edit, X, Check } from "lucide-react"

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

interface Quiz {
  id: string
  title: string
  sections: string[]
  questions: Question[]
}

interface BulkManagerProps {
  quiz: Quiz
  onQuizUpdate: (updatedQuiz: Quiz) => void
  onClose: () => void
}

export default function BulkManager({ quiz, onQuizUpdate, onClose }: BulkManagerProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([])
  const [editingBulk, setEditingBulk] = useState(false)
  const [bulkEditData, setBulkEditData] = useState("")

  const handleBulkUpload = async () => {
    if (!uploadFile) return

    try {
      setUploadError("")
      setSuccess("")
      const text = await uploadFile.text()

      let questionsData
      try {
        questionsData = JSON.parse(text)
      } catch (parseError) {
        setUploadError("Invalid JSON file. Please check the syntax and try again.")
        return
      }

      if (!Array.isArray(questionsData)) {
        setUploadError("Invalid JSON format. Expected an array of questions.")
        return
      }

      if (questionsData.length === 0) {
        setUploadError("No questions found in the file.")
        return
      }

      const validQuestions = []
      const errors = []
      const warnings = []

      for (const [index, questionData] of questionsData.entries()) {
        const questionNumber = index + 1

        // Validate required fields
        if (!questionData.section) {
          errors.push(`Question ${questionNumber}: Missing 'section' field`)
          continue
        }

        if (!questionData.question || questionData.question.trim() === "") {
          errors.push(`Question ${questionNumber}: Missing or empty 'question' field`)
          continue
        }

        if (!Array.isArray(questionData.options)) {
          errors.push(`Question ${questionNumber}: 'options' must be an array`)
          continue
        }

        if (questionData.options.length !== 4) {
          errors.push(`Question ${questionNumber}: Must have exactly 4 options, found ${questionData.options.length}`)
          continue
        }

        if (typeof questionData.correctAnswer !== "number") {
          errors.push(`Question ${questionNumber}: 'correctAnswer' must be a number`)
          continue
        }

        if (questionData.correctAnswer < 0 || questionData.correctAnswer > 3) {
          errors.push(
            `Question ${questionNumber}: 'correctAnswer' must be between 0 and 3, found ${questionData.correctAnswer}`,
          )
          continue
        }

        // Validate section exists in quiz
        if (!quiz.sections.includes(questionData.section)) {
          errors.push(
            `Question ${questionNumber}: Invalid section "${questionData.section}". Available sections: ${quiz.sections.join(", ")}`,
          )
          continue
        }

        // Validate options are not empty
        const emptyOptions = questionData.options
          .map((opt: any, idx: number) => (!opt || opt.toString().trim() === "" ? idx + 1 : null))
          .filter((idx) => idx !== null)

        if (emptyOptions.length > 0) {
          errors.push(`Question ${questionNumber}: Empty options found at positions: ${emptyOptions.join(", ")}`)
          continue
        }

        // Check for duplicate options
        const uniqueOptions = new Set(questionData.options.map((opt: string) => opt.trim().toLowerCase()))
        if (uniqueOptions.size !== 4) {
          warnings.push(`Question ${questionNumber}: Duplicate options detected`)
        }

        // Check if question already exists
        const existingQuestion = quiz.questions.find(
          (q) => q.question.toLowerCase().trim() === questionData.question.toLowerCase().trim(),
        )
        if (existingQuestion) {
          warnings.push(`Question ${questionNumber}: Similar question already exists`)
        }

        const question: Question = {
          id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
          quizId: quiz.id,
          section: questionData.section.toLowerCase(),
          question: questionData.question.trim(),
          options: questionData.options.map((opt: string) => opt.toString().trim()),
          correctAnswer: questionData.correctAnswer,
          explanation: questionData.explanation?.trim() || "",
          image: questionData.image || "",
          createdAt: new Date().toISOString(),
        }
        validQuestions.push(question)
      }

      if (errors.length > 0) {
        setUploadError(
          `Found ${errors.length} error(s):\n${errors.slice(0, 10).join("\n")}${errors.length > 10 ? `\n... and ${errors.length - 10} more errors` : ""}`,
        )
        return
      }

      const updatedQuiz = {
        ...quiz,
        questions: [...quiz.questions, ...validQuestions],
      }

      onQuizUpdate(updatedQuiz)

      let successMessage = `Successfully uploaded ${validQuestions.length} questions!`
      if (warnings.length > 0) {
        successMessage += `\n\nWarnings:\n${warnings.slice(0, 5).join("\n")}${warnings.length > 5 ? `\n... and ${warnings.length - 5} more warnings` : ""}`
      }

      setSuccess(successMessage)
      setUploadFile(null)
    } catch (error) {
      setUploadError("An unexpected error occurred while processing the file. Please try again.")
      console.error("Bulk upload error:", error)
    }
  }

  const handleBulkDelete = () => {
    if (selectedQuestions.length === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedQuestions.length} questions?`)) return

    const updatedQuiz = {
      ...quiz,
      questions: quiz.questions.filter((q) => !selectedQuestions.includes(q.id)),
    }

    onQuizUpdate(updatedQuiz)
    setSelectedQuestions([])
    setSuccess(`Deleted ${selectedQuestions.length} questions successfully!`)
  }

  const handleSelectAll = () => {
    if (selectedQuestions.length === quiz.questions.length) {
      setSelectedQuestions([])
    } else {
      setSelectedQuestions(quiz.questions.map((q) => q.id))
    }
  }

  const handleQuestionSelect = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId) ? prev.filter((id) => id !== questionId) : [...prev, questionId],
    )
  }

  const downloadQuestionsAsJSON = () => {
    const questionsToExport =
      selectedQuestions.length > 0 ? quiz.questions.filter((q) => selectedQuestions.includes(q.id)) : quiz.questions

    const exportData = questionsToExport.map((q) => ({
      section: q.section,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "",
      image: q.image || "",
    }))

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${quiz.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_questions.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const downloadSampleJSON = () => {
    const sampleQuestions = [
      {
        section: quiz.sections[0] || "reasoning",
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
        image: "",
      },
      {
        section: quiz.sections.includes("quantitative") ? "quantitative" : quiz.sections[0],
        question: "What is 15% of 240?",
        options: ["36", "35", "38", "40"],
        correctAnswer: 0,
        explanation: "15% of 240 = (15/100) × 240 = 0.15 × 240 = 36",
      },
      {
        section: quiz.sections.includes("english") ? "english" : quiz.sections[0],
        question: "Choose the correct synonym for 'Abundant':",
        options: ["Scarce", "Plentiful", "Limited", "Rare"],
        correctAnswer: 1,
        explanation: "Abundant means existing in large quantities; plentiful is the closest synonym.",
      },
    ]

    const blob = new Blob([JSON.stringify(sampleQuestions, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sample-questions-${quiz.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBulkEdit = () => {
    try {
      const editedQuestions = JSON.parse(bulkEditData)
      if (!Array.isArray(editedQuestions)) {
        setUploadError("Invalid JSON format for bulk edit.")
        return
      }

      // Validate and update questions
      const updatedQuestions = quiz.questions.map((existingQ) => {
        const editedQ = editedQuestions.find((eq) => eq.id === existingQ.id)
        if (editedQ) {
          return {
            ...existingQ,
            section: editedQ.section,
            question: editedQ.question,
            options: editedQ.options,
            correctAnswer: editedQ.correctAnswer,
            explanation: editedQ.explanation || "",
          }
        }
        return existingQ
      })

      const updatedQuiz = { ...quiz, questions: updatedQuestions }
      onQuizUpdate(updatedQuiz)
      setSuccess("Bulk edit completed successfully!")
      setEditingBulk(false)
      setBulkEditData("")
    } catch (error) {
      setUploadError("Invalid JSON format for bulk edit.")
    }
  }

  const prepareBulkEdit = () => {
    const questionsToEdit =
      selectedQuestions.length > 0 ? quiz.questions.filter((q) => selectedQuestions.includes(q.id)) : quiz.questions

    const editData = questionsToEdit.map((q) => ({
      id: q.id,
      section: q.section,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || "",
    }))

    setBulkEditData(JSON.stringify(editData, null, 2))
    setEditingBulk(true)
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Bulk Question Manager</CardTitle>
            <CardDescription>Upload, edit, and manage questions in bulk</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="manage">Manage</TabsTrigger>
            <TabsTrigger value="edit">Bulk Edit</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            {uploadError && (
              <Alert variant="destructive">
                <AlertDescription className="whitespace-pre-line">{uploadError}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="jsonFile">Select JSON File</Label>
                <Input
                  id="jsonFile"
                  type="file"
                  accept=".json"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    setUploadFile(file || null)
                    setUploadError("")
                    setSuccess("")
                  }}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleBulkUpload} disabled={!uploadFile}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Questions
                </Button>
                <Button variant="outline" onClick={downloadSampleJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Sample
                </Button>
              </div>

              <div className="text-sm text-muted-foreground space-y-2">
                <p className="font-medium">JSON Format Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Array of question objects</li>
                  <li>Required: section, question, options (array of 4), correctAnswer (0-3)</li>
                  <li>Optional: explanation, image (URL or base64)</li>
                  <li>Valid sections: {quiz.sections.join(", ")}</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* Manage Tab */}
          <TabsContent value="manage" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSelectAll}>
                  {selectedQuestions.length === quiz.questions.length ? "Deselect All" : "Select All"}
                </Button>
                <Button variant="destructive" onClick={handleBulkDelete} disabled={selectedQuestions.length === 0}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected ({selectedQuestions.length})
                </Button>
              </div>
              <Badge variant="outline">{quiz.questions.length} total questions</Badge>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {quiz.questions.map((question, index) => (
                <div
                  key={question.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedQuestions.includes(question.id)
                      ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => handleQuestionSelect(question.id)}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(question.id)}
                      onChange={() => handleQuestionSelect(question.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {question.section}
                        </Badge>
                        <span className="text-sm text-muted-foreground">Q{index + 1}</span>
                      </div>
                      <p className="text-sm font-medium line-clamp-2">{question.question}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Correct: {question.options[question.correctAnswer]}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Bulk Edit Tab */}
          <TabsContent value="edit" className="space-y-4">
            {!editingBulk ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select questions to edit in bulk, or edit all questions at once.
                </p>
                <div className="flex gap-2">
                  <Button onClick={prepareBulkEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit {selectedQuestions.length > 0 ? `Selected (${selectedQuestions.length})` : "All Questions"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label htmlFor="bulkEditData">Edit Questions JSON</Label>
                  <div className="flex gap-2">
                    <Button onClick={handleBulkEdit}>
                      <Check className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                    <Button variant="outline" onClick={() => setEditingBulk(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
                <Textarea
                  id="bulkEditData"
                  value={bulkEditData}
                  onChange={(e) => setBulkEditData(e.target.value)}
                  className="min-h-96 font-mono text-sm"
                  placeholder="Edit the JSON data..."
                />
                <p className="text-xs text-muted-foreground">
                  Edit the JSON data above. Make sure to maintain the correct structure.
                </p>
              </div>
            )}
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Export questions to JSON format for backup or sharing.</p>

              <div className="flex gap-2">
                <Button onClick={downloadQuestionsAsJSON}>
                  <Download className="h-4 w-4 mr-2" />
                  Export {selectedQuestions.length > 0 ? `Selected (${selectedQuestions.length})` : "All Questions"}
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                <p className="font-medium mb-2">Export includes:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Question text and options</li>
                  <li>Correct answers and explanations</li>
                  <li>Section assignments</li>
                  <li>Images (if any)</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
