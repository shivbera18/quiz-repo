"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, Loader2, Wand2, Brain, X } from "lucide-react"
import MathRenderer from "@/components/math-renderer"

interface AIGeneratedQuestion {
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  tags: string[]
}

interface AIQuestionGeneratorProps {
  isOpen: boolean
  onClose: () => void
  onGenerate: (questions: any[]) => void
  userToken: string
  availableSections: string[]
}

const predefinedTopics = {
  "Quantitative Aptitude": [
    "Arithmetic", "Algebra", "Geometry", "Percentage", "Profit & Loss", 
    "Time & Work", "Speed & Distance", "Probability", "Statistics"
  ],
  "Verbal Reasoning": [
    "Reading Comprehension", "Synonyms & Antonyms", "Sentence Completion", 
    "Analogies", "Critical Reasoning", "Vocabulary"
  ],
  "Logical Reasoning": [
    "Puzzles", "Seating Arrangement", "Blood Relations", "Coding-Decoding", 
    "Direction Sense", "Pattern Recognition", "Syllogisms"
  ],
  "General Knowledge": [
    "Current Affairs", "History", "Geography", "Science", "Sports", 
    "Politics", "Economics", "Technology"
  ],
  "English": [
    "Grammar", "Comprehension", "Vocabulary", "Sentence Correction", 
    "Para Jumbles", "Fill in the Blanks"
  ]
}

export default function AIQuestionGenerator({ 
  isOpen, 
  onClose, 
  onGenerate, 
  userToken,
  availableSections 
}: AIQuestionGeneratorProps) {
  const [selectedSection, setSelectedSection] = useState("")
  const [customTopic, setCustomTopic] = useState("")
  const [selectedTopic, setSelectedTopic] = useState("")
  const [difficulty, setDifficulty] = useState("medium")
  const [questionCount, setQuestionCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [generatedQuestions, setGeneratedQuestions] = useState<AIGeneratedQuestion[]>([])
  const [showPreview, setShowPreview] = useState(false)

  const availableTopics = selectedSection ? predefinedTopics[selectedSection as keyof typeof predefinedTopics] || [] : []

  const handleGenerate = async () => {
    if (!selectedSection || (!selectedTopic && !customTopic) || questionCount < 1) {
      setError("Please fill in all required fields")
      return
    }

    setLoading(true)
    setError("")

    try {
      const topic = customTopic.trim() || selectedTopic
      
      console.log('AI Generator - Starting generation with:', {
        topic,
        difficulty,
        count: questionCount,
        section: selectedSection,
        userToken: userToken ? 'Present' : 'Missing'
      })
      
      const response = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          topic,
          difficulty,
          count: questionCount,
          section: selectedSection
        })
      })

      console.log('AI Generator - Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json()
        console.error('AI Generator - Error response:', errorData)
        throw new Error(errorData.details || 'Failed to generate questions')
      }

      const data = await response.json()
      console.log('AI Generator - Success:', data.questions?.length, 'questions generated')
      setGeneratedQuestions(data.questions)
      setShowPreview(true)
      
    } catch (err) {
      console.error('AI Generation Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate questions')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptQuestions = () => {
    console.log('AI Generator - Accepting questions:', generatedQuestions.length)
    
    const formattedQuestions = generatedQuestions.map(q => ({
      section: selectedSection,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      difficulty: difficulty as 'easy' | 'medium' | 'hard',
      tags: q.tags || []
    }))

    console.log('AI Generator - Formatted questions:', formattedQuestions.length)
    console.log('AI Generator - Sample formatted question:', formattedQuestions[0])

    onGenerate(formattedQuestions)
    handleClose()
  }

  const handleClose = () => {
    setSelectedSection("")
    setSelectedTopic("")
    setCustomTopic("")
    setDifficulty("medium")
    setQuestionCount(5)
    setGeneratedQuestions([])
    setShowPreview(false)
    setError("")
    onClose()
  }

  const removeQuestion = (index: number) => {
    setGeneratedQuestions(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Question Generator
          </DialogTitle>
          <DialogDescription>
            Generate high-quality questions using AI based on your specifications.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {!showPreview ? (
            // Generation Form
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Section *</Label>
                  <Select value={selectedSection} onValueChange={setSelectedSection}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSections.map(section => (
                        <SelectItem key={section} value={section}>{section}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Difficulty Level *</Label>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedSection && availableTopics.length > 0 && (
                <div className="space-y-2">
                  <Label>Predefined Topics</Label>
                  <div className="flex flex-wrap gap-2">
                    {availableTopics.map(topic => (
                      <Badge
                        key={topic}
                        variant={selectedTopic === topic ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => {
                          setSelectedTopic(selectedTopic === topic ? "" : topic)
                          setCustomTopic("")
                        }}
                      >
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Custom Topic {selectedTopic ? "(Optional)" : "*"}</Label>
                <Textarea
                  placeholder="Describe the specific topic you want questions about..."
                  value={customTopic}
                  onChange={(e) => {
                    setCustomTopic(e.target.value)
                    if (e.target.value.trim()) {
                      setSelectedTopic("")
                    }
                  }}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Number of Questions *</Label>
                <Select value={questionCount.toString()} onValueChange={(v) => setQuestionCount(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>{num} question{num !== 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-800 dark:text-blue-200">AI Tips</span>
                </div>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Be specific about the topic for better results</li>
                  <li>• AI generates questions with explanations automatically</li>
                  <li>• You can edit generated questions before adding them</li>
                  <li>• Start with fewer questions to test the results</li>
                </ul>
              </div>
            </div>
          ) : (
            // Preview Generated Questions
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Generated Questions ({generatedQuestions.length})</h3>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate New
                </Button>
              </div>

              {generatedQuestions.map((question, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">
                        Q{index + 1}. <MathRenderer text={question.question} />
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(index)}
                        title="Remove this question"
                      >
                        <X className="h-4 w-4" />
                      </Button>
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
                            <MathRenderer text={option} />
                            {optIndex === question.correctAnswer && (
                              <Badge variant="default" className="ml-2 text-xs">Correct</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                      
                      {question.explanation && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded border border-blue-200 dark:border-blue-800">
                          <Label className="text-sm font-medium text-blue-700 dark:text-blue-300">
                            AI Explanation:
                          </Label>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                            <MathRenderer text={question.explanation} />
                          </p>
                        </div>
                      )}

                      {question.tags && question.tags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {question.tags.map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {generatedQuestions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  All questions removed. Generate new questions to continue.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {showPreview 
              ? `${generatedQuestions.length} question${generatedQuestions.length !== 1 ? 's' : ''} ready to add`
              : "Configure your AI question generation settings"
            }
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            {!showPreview ? (
              <Button 
                onClick={handleGenerate} 
                disabled={loading || !selectedSection || (!selectedTopic && !customTopic)}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Questions
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleAcceptQuestions}
                disabled={generatedQuestions.length === 0}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Add {generatedQuestions.length} Question{generatedQuestions.length !== 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
