"use client"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Sparkles, Clock, BookOpen, Target, Settings } from "lucide-react"

interface Subject {
  id: string
  name: string
  description: string
}

interface Chapter {
  id: string
  name: string
  description: string
  subjectId: string
}

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
  tags?: string[]
  createdAt: string
}

interface AIQuizGeneratorProps {
  onQuizCreated: (quiz: Quiz) => void
  onClose: () => void
}

export default function AIQuizGenerator({ onQuizCreated, onClose }: AIQuizGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Subject and Chapter data
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [loadingSubjects, setLoadingSubjects] = useState(true)
  const [loadingChapters, setLoadingChapters] = useState(false)
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    topic: "",
    subjectId: "none",
    chapterId: "none",
    sections: [] as string[],
    difficulty: "medium",
    questionsPerSection: 10,
    duration: 60, // minutes
    negativeMarking: true,
    negativeMarkValue: 0.25,
  })

  const availableSections = [
    "reasoning", "quantitative", "verbal", "general-knowledge",
    "english", "mathematics", "science", "computer-science",
    "current-affairs", "aptitude", "logical-reasoning", "data-interpretation"
  ]

  const difficultyLevels = [
    { value: "easy", label: "Easy", description: "Basic level questions" },
    { value: "medium", label: "Medium", description: "Moderate difficulty" },
    { value: "hard", label: "Hard", description: "Advanced level questions" },
    { value: "mixed", label: "Mixed", description: "Combination of all levels" }
  ]

  // Fetch subjects on component mount
  useEffect(() => {
    fetchSubjects()
  }, [])

  const fetchSubjects = async () => {
    try {
      const response = await fetch('/api/subjects')
      if (response.ok) {
        const data = await response.json()
        setSubjects(data)
      } else {
        setError('Failed to load subjects')
      }
    } catch (error) {
      setError('Error loading subjects')
    } finally {
      setLoadingSubjects(false)
    }
  }

  const fetchChapters = async (subjectId: string) => {
    if (!subjectId || subjectId === "none") return
    
    setLoadingChapters(true)
    try {
      const response = await fetch(`/api/subjects/${subjectId}/chapters`)
      if (response.ok) {
        const data = await response.json()
        setChapters(data)
      } else {
        setError('Failed to load chapters')
        setChapters([])
      }
    } catch (error) {
      setError('Error loading chapters')
      setChapters([])
    } finally {
      setLoadingChapters(false)
    }
  }

  const handleSubjectChange = (subjectId: string) => {
    setFormData(prev => ({ 
      ...prev, 
      subjectId,
      chapterId: "none" // Reset chapter when subject changes
    }))
    if (subjectId !== "none") {
      fetchChapters(subjectId)
    } else {
      setChapters([])
    }
  }

  const handleSectionToggle = (section: string) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section]
    }))
  }

  const generateQuiz = async () => {
    // Clear previous messages
    setError("")
    setSuccess("")
    
    // Comprehensive validation with specific error messages
    if (!formData.title.trim()) {
      setError("❌ Quiz title is required")
      return
    }
    
    if (formData.title.trim().length < 3) {
      setError("❌ Quiz title must be at least 3 characters long")
      return
    }
    
    if (!formData.topic.trim()) {
      setError("❌ Topic/subject matter is required for AI quiz generation")
      return
    }
    
    if (formData.topic.trim().length < 5) {
      setError("❌ Topic must be at least 5 characters long to generate meaningful questions")
      return
    }
    
    if (formData.sections.length === 0) {
      setError("❌ Please select at least one section (e.g., Quantitative, Reasoning, English)")
      return
    }
    
    if (formData.questionsPerSection < 1) {
      setError("❌ Questions per section must be at least 1")
      return
    }
    
    if (formData.questionsPerSection > 50) {
      setError("❌ Questions per section cannot exceed 50 (to avoid API limits)")
      return
    }
    
    if (formData.duration < 5) {
      setError("❌ Quiz duration must be at least 5 minutes")
      return
    }
    
    if (!formData.subjectId || formData.subjectId === "none") {
      setError("❌ Please select a subject - this is required for proper organization")
      return
    }
    
    if (!formData.chapterId || formData.chapterId === "none") {
      setError("❌ Please select a chapter - this is required for proper organization")
      return
    }

    setIsGenerating(true)

    try {
      console.log('🤖 Generating AI quiz with data:', {
        title: formData.title,
        topic: formData.topic,
        subjectId: formData.subjectId,
        chapterId: formData.chapterId,
        sections: formData.sections,
        difficulty: formData.difficulty,
        questionsPerSection: formData.questionsPerSection,
        duration: formData.duration
      })

      // Generate complete quiz using the new API endpoint
      const response = await fetch('/api/ai/generate-quiz', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-token-placeholder'
        },
        body: JSON.stringify({
          title: formData.title.trim(),
          description: formData.description.trim(),
          topic: formData.topic.trim(),
          subjectId: formData.subjectId === "none" ? null : formData.subjectId,
          chapterId: formData.chapterId === "none" ? null : formData.chapterId,
          sections: formData.sections,
          difficulty: formData.difficulty,
          questionsPerSection: formData.questionsPerSection,
          duration: formData.duration,
          negativeMarking: formData.negativeMarking,
          negativeMarkValue: formData.negativeMarkValue
        })
      })

      console.log('🤖 AI API Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ AI API Error Response:', errorText)
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }

        // Specific error messages based on API response
        if (response.status === 400) {
          setError(`❌ AI Validation Error: ${errorData.error || 'Invalid quiz generation parameters'}`)
        } else if (response.status === 401) {
          setError("❌ AI Authentication Error: API key invalid or missing")
        } else if (response.status === 403) {
          setError("❌ AI Permission Error: Access denied to AI service")
        } else if (response.status === 429) {
          setError("❌ AI Rate Limit Error: Too many requests. Please wait a moment and try again.")
        } else if (response.status === 500) {
          setError(`❌ AI Service Error: ${errorData.error || 'Internal AI service error'}`)
        } else if (response.status === 503) {
          setError("❌ AI Service Unavailable: The AI service is temporarily down. Please try again later.")
        } else {
          setError(`❌ AI Unknown Error (${response.status}): ${errorData.error || 'Failed to generate quiz'}`)
        }
        return
      }

      const data = await response.json()
      console.log('✅ AI Quiz generation successful:', data)
      
      if (!data.success) {
        setError(`❌ AI Generation Failed: ${data.error || 'AI service returned failure status'}`)
        return
      }
      
      if (!data.quiz) {
        setError("❌ AI Response Error: Quiz data is missing from AI response")
        return
      }
      
      if (!data.quiz.questions || data.quiz.questions.length === 0) {
        setError("❌ AI Generation Error: No questions were generated. Try a different topic or parameters.")
        return
      }

      setSuccess(`✅ AI Quiz "${data.quiz.title}" created successfully with ${data.quiz.questions.length} questions!`)
      onQuizCreated(data.quiz)
      
      // Reset form
      setFormData({
        title: "",
        description: "",
        topic: "",
        subjectId: "none",
        chapterId: "none",
        sections: [],
        difficulty: "medium",
        questionsPerSection: 10,
        duration: 60,
        negativeMarking: true,
        negativeMarkValue: 0.25,
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate quiz")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          AI Quiz Generator
        </CardTitle>
        <CardDescription>
          Create a complete quiz with AI-generated questions across multiple sections
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert>
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}

        {/* Quiz Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Quiz Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="e.g., Comprehensive Aptitude Test"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="topic">Topic/Subject *</Label>
            <Input
              id="topic"
              value={formData.topic}
              onChange={(e) => setFormData(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="e.g., Banking Exam, UPSC Prelims, CAT"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the quiz (optional)"
            rows={3}
          />
        </div>

        {/* Subject and Chapter Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject (Optional)</Label>
            <Select 
              value={formData.subjectId} 
              onValueChange={handleSubjectChange}
              disabled={loadingSubjects}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingSubjects ? "Loading subjects..." : "Select a subject"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No subject (General Quiz)</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="chapter">Chapter (Optional)</Label>
            <Select 
              value={formData.chapterId} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, chapterId: value }))}
              disabled={!formData.subjectId || formData.subjectId === "none" || loadingChapters || chapters.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={
                  !formData.subjectId || formData.subjectId === "none"
                    ? "Select a subject first" 
                    : loadingChapters 
                      ? "Loading chapters..." 
                      : chapters.length === 0
                        ? "No chapters available"
                        : "Select a chapter"
                } />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No specific chapter</SelectItem>
                {chapters.map((chapter) => (
                  <SelectItem key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sections Selection */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Select Sections *
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableSections.map((section) => (
              <Button
                key={section}
                variant={formData.sections.includes(section) ? "default" : "outline"}
                size="sm"
                onClick={() => handleSectionToggle(section)}
                className="justify-start"
              >
                {section.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Button>
            ))}
          </div>
          {formData.sections.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {formData.sections.map((section) => (
                <Badge key={section} variant="secondary">
                  {section.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Quiz Configuration */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="difficulty" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Difficulty
            </Label>
            <Select
              value={formData.difficulty}
              onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty" />
              </SelectTrigger>
              <SelectContent>
                {difficultyLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div>
                      <div className="font-medium">{level.label}</div>
                      <div className="text-xs text-muted-foreground">{level.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="questionsPerSection">Questions per Section</Label>
            <Input
              id="questionsPerSection"
              type="number"
              min="1"
              max="50"
              value={formData.questionsPerSection}
              onChange={(e) => setFormData(prev => ({ ...prev, questionsPerSection: parseInt(e.target.value) || 10 }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duration (minutes)
            </Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="300"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) || 60 }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="negativeMarkValue" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Negative Marking
            </Label>
            <div className="space-y-2">
              <Select
                value={formData.negativeMarking ? "enabled" : "disabled"}
                onValueChange={(value) => setFormData(prev => ({ ...prev, negativeMarking: value === "enabled" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
              {formData.negativeMarking && (
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  max="1"
                  value={formData.negativeMarkValue}
                  onChange={(e) => setFormData(prev => ({ ...prev, negativeMarkValue: parseFloat(e.target.value) || 0.25 }))}
                  placeholder="0.25"
                />
              )}
            </div>
          </div>
        </div>

        {/* Generation Summary */}
        {formData.sections.length > 0 && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Generation Summary</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>• Total Questions: {formData.sections.length * formData.questionsPerSection}</p>
              <p>• Sections: {formData.sections.length}</p>
              <p>• Duration: {formData.duration} minutes</p>
              <p>• Difficulty: {formData.difficulty}</p>
              <p>• Negative Marking: {formData.negativeMarking ? `Yes (-${formData.negativeMarkValue})` : "No"}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={generateQuiz}
            disabled={isGenerating || !formData.title || !formData.topic || formData.sections.length === 0}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Quiz...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate AI Quiz
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
