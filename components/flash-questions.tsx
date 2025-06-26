"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, Zap, Check, AlertCircle } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"

interface Question {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  section: string
}

interface FlashQuestionsProps {
  isOpen: boolean
  onClose: () => void
  questions: Question[]
}

const mathChapters = [
  "Addition",
  "Subtraction", 
  "Multiplication",
  "Division"
]

// Function to generate simple arithmetic questions
const generateArithmeticQuestion = (type: string): Question => {
  const id = Math.random().toString(36).slice(2)
  let question = ""
  let correctAnswer = 0
  let options: string[] = []
  
  switch (type) {
    case "Addition": {
      const a = Math.floor(Math.random() * 50) + 1
      const b = Math.floor(Math.random() * 50) + 1
      const result = a + b
      question = `What is ${a} + ${b}?`
      correctAnswer = result
      // Generate 3 wrong answers
      const wrongAnswers = [
        result + Math.floor(Math.random() * 10) + 1,
        result - Math.floor(Math.random() * 10) - 1,
        result + Math.floor(Math.random() * 20) + 10
      ]
      options = [result, ...wrongAnswers].map(n => n.toString())
      break
    }
    case "Subtraction": {
      const a = Math.floor(Math.random() * 50) + 25 // Ensure positive result
      const b = Math.floor(Math.random() * (a - 1)) + 1
      const result = a - b
      question = `What is ${a} - ${b}?`
      correctAnswer = result
      const wrongAnswers = [
        result + Math.floor(Math.random() * 10) + 1,
        result - Math.floor(Math.random() * 10) - 1,
        Math.abs(result - Math.floor(Math.random() * 15) - 5)
      ]
      options = [result, ...wrongAnswers].map(n => n.toString())
      break
    }
    case "Multiplication": {
      const a = Math.floor(Math.random() * 12) + 2
      const b = Math.floor(Math.random() * 12) + 2
      const result = a * b
      question = `What is ${a} × ${b}?`
      correctAnswer = result
      const wrongAnswers = [
        result + a,
        result - b,
        result + Math.floor(Math.random() * 20) + 5
      ]
      options = [result, ...wrongAnswers].map(n => n.toString())
      break
    }
    case "Division": {
      const b = Math.floor(Math.random() * 10) + 2
      const result = Math.floor(Math.random() * 15) + 2
      const a = b * result // Ensure clean division
      question = `What is ${a} ÷ ${b}?`
      correctAnswer = result
      const wrongAnswers = [
        result + 1,
        result - 1,
        result + Math.floor(Math.random() * 5) + 2
      ]
      options = [result, ...wrongAnswers].map(n => n.toString())
      break
    }
    default:
      // Fallback to addition
      const a = Math.floor(Math.random() * 20) + 1
      const b = Math.floor(Math.random() * 20) + 1
      const result = a + b
      question = `What is ${a} + ${b}?`
      correctAnswer = result
      options = [result, result + 1, result - 1, result + 5].map(n => n.toString())
  }
  
  // Shuffle options and find correct index
  const correctAnswerStr = correctAnswer.toString()
  const shuffledOptions = [...options].sort(() => Math.random() - 0.5)
  const correctIndex = shuffledOptions.indexOf(correctAnswerStr)
  
  return {
    id,
    question,
    options: shuffledOptions,
    correctAnswer: correctIndex,
    section: type
  }
}

export function FlashQuestions({ isOpen, onClose, questions: _questions }: FlashQuestionsProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [answeredQuestions, setAnsweredQuestions] = useState<number[]>([])
  const [slideDirection, setSlideDirection] = useState<'left' | 'right'>('right')
  const [chapter, setChapter] = useState(mathChapters[0])
  const [difficulty, setDifficulty] = useState("medium")
  const [showSpeedPrompt, setShowSpeedPrompt] = useState(true)
  const [loadingAI, setLoadingAI] = useState(false)
  const [aiError, setAIError] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])

  // Generate initial arithmetic questions
  useEffect(() => {
    if (isOpen && questions.length === 0) {
      generateNewQuestions()
    }
  }, [isOpen])

  const generateNewQuestions = () => {
    const newQuestions: Question[] = []
    const questionTypes = ["Addition", "Subtraction", "Multiplication", "Division"]
    
    // Generate 10 random arithmetic questions
    for (let i = 0; i < 10; i++) {
      const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)]
      newQuestions.push(generateArithmeticQuestion(randomType))
    }
    
    setQuestions(newQuestions)
    setCurrentQuestionIndex(0)
    setSelectedAnswer(null)
    setScore(0)
    setShowResult(false)
    setAnsweredQuestions([])
    setShowSpeedPrompt(false)
  }

  const currentQuestion = questions[currentQuestionIndex]

  // Safety check for question data
  if (!currentQuestion || !Array.isArray(currentQuestion.options) || currentQuestion.options.length === 0) {
    if (questions.length > 0) {
      console.error('Invalid question data at index', currentQuestionIndex, ':', currentQuestion)
    }
    return null
  }

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setCurrentQuestionIndex(0)
      setSelectedAnswer(null)
      setScore(0)
      setShowResult(false)
      setAnsweredQuestions([])
      setQuestions([])
      setShowSpeedPrompt(true)
    }
  }, [isOpen])

  const handleAnswerSelect = (answerIndex: number) => {
    if (selectedAnswer !== null) return // Prevent multiple selections

    // Validate question data
    if (!currentQuestion || !Array.isArray(currentQuestion.options) || currentQuestion.options.length === 0) {
      console.error('Invalid question data:', currentQuestion)
      return
    }

    // Validate answer index
    if (typeof currentQuestion.correctAnswer !== 'number' || 
        currentQuestion.correctAnswer < 0 || 
        currentQuestion.correctAnswer >= currentQuestion.options.length) {
      console.error('Invalid correctAnswer:', currentQuestion.correctAnswer, 'for options:', currentQuestion.options)
      return
    }

    setSelectedAnswer(answerIndex)
    setIsAnimating(true)
    setSlideDirection('right')

    // Check if answer is correct with extra validation
    const isCorrect = answerIndex === currentQuestion.correctAnswer
    
    if (isCorrect) {
      setScore(prev => prev + 1)
    }

    // Add to answered questions
    setAnsweredQuestions(prev => [...prev, currentQuestionIndex])

    // Move to next question after animation
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        setSlideDirection('left') // Slide in from left for next question
        setCurrentQuestionIndex(prev => prev + 1)
        setSelectedAnswer(null)
        
        // Reset animation after slide-in
        setTimeout(() => {
          setIsAnimating(false)
          setSlideDirection('right') // Prepare for next slide-out
        }, 100)
      } else {
        // Show final results
        setShowResult(true)
        setIsAnimating(false)
      }
    }, 800)
  }

  const handleClose = () => {
    setIsAnimating(true)
    setTimeout(() => {
      onClose()
      setIsAnimating(false)
    }, 300)
  }

  // Generate a single new arithmetic question
  const handleGenerateAIQuestion = () => {
    setLoadingAI(true)
    setAIError("")
    
    try {
      const newQuestion = generateArithmeticQuestion(chapter)
      
      // Add new question to the start of the flash questions
      setQuestions(prev => [newQuestion, ...prev])
      setCurrentQuestionIndex(0)
      setSelectedAnswer(null)
      setShowResult(false)
      setAnsweredQuestions([])
    } catch (err: any) {
      setAIError("Failed to generate question. Please try again.")
    } finally {
      setLoadingAI(false)
    }
  }

  // Generate arithmetic questions for speed practice
  const startSpeedCalculation = () => {
    setLoadingAI(true)
    setAIError("")
    
    try {
      generateNewQuestions()
      setShowSpeedPrompt(false)
    } catch (err: any) {
      setAIError("Failed to generate questions. Please try again.")
    } finally {
      setLoadingAI(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={`relative w-full max-w-2xl mx-auto transition-all duration-500 ${
        isAnimating 
          ? slideDirection === 'right'
            ? 'transform translate-x-full opacity-0'
            : 'transform -translate-x-full opacity-0'
          : 'transform translate-x-0 opacity-100'
      }`}>
        <Card className="bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 border-purple-600 text-white shadow-2xl">
          <CardContent className="p-4 sm:p-8">
            {showSpeedPrompt ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] gap-6">
                <h2 className="text-xl sm:text-2xl font-bold text-center">Ready for arithmetic speed practice?</h2>
                <p className="text-purple-200 text-center">Practice addition, subtraction, multiplication, and division</p>
                <Button onClick={startSpeedCalculation} disabled={loadingAI} className="flex items-center gap-2 text-lg">
                  {loadingAI ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />}
                  Start Arithmetic Practice
                </Button>
                {aiError && <div className="text-red-300 text-xs mt-2">{aiError}</div>}
                <Button onClick={onClose} variant="destructive" className="mt-4">Cancel</Button>
              </div>
            ) : (
              <>
                {/* Chapter & Difficulty Selectors + AI Button */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4 items-center w-full">
                  <Select value={chapter} onValueChange={setChapter}>
                    <SelectTrigger className="w-full sm:w-48 min-w-0 max-w-xs">
                      <SelectValue placeholder="Math Chapter" />
                    </SelectTrigger>
                    <SelectContent>
                      {mathChapters.map((ch) => (
                        <SelectItem key={ch} value={ch}>{ch}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={difficulty} onValueChange={setDifficulty}>
                    <SelectTrigger className="w-full sm:w-32 min-w-0 max-w-xs">
                      <SelectValue placeholder="Difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleGenerateAIQuestion} disabled={loadingAI} className="flex items-center gap-2 w-full sm:w-auto">
                    {loadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                    Add New Question
                  </Button>
                </div>
                {aiError && <div className="text-red-300 text-xs mb-2">{aiError}</div>}

                {/* Header */}
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-purple-700 rounded-full flex-shrink-0">
                      <Zap className="h-4 w-4 sm:h-6 sm:w-6 text-yellow-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-lg sm:text-2xl font-bold truncate">Flash Questions</h2>
                      <p className="text-purple-200 text-xs sm:text-sm">Quick rapid-fire practice</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="text-purple-200 hover:text-white hover:bg-purple-700 flex-shrink-0"
                  >
                    <X className="h-5 w-5 sm:h-6 sm:w-6" />
                  </Button>
                </div>

                {/* Progress Bar */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-purple-200 mb-2">
                    <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                    <span>Score: {score}/{answeredQuestions.length}</span>
                  </div>
                  <div className="w-full bg-purple-800 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {!showResult ? (
                  <>
                    {/* Progress */}
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-purple-200">
                          Question {currentQuestionIndex + 1} of {questions.length}
                        </span>
                        <span className="text-sm text-purple-200">
                          Score: {score}/{answeredQuestions.length}
                        </span>
                      </div>
                      <div className="w-full bg-purple-700 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Question */}
                    <div className={`transition-all duration-500 ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}>
                      <div className="mb-4 sm:mb-6">                      <div className="text-xs text-purple-300 mb-2 uppercase tracking-wide">
                        {currentQuestion.section}
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold leading-relaxed">
                        {currentQuestion.question}
                      </h3>
                      </div>

                      {/* Options */}
                      <div className="grid gap-2 sm:gap-3">
                        {currentQuestion.options.map((option, index) => (
                          <button
                            key={index}
                            onClick={() => handleAnswerSelect(index)}
                            disabled={selectedAnswer !== null}
                            className={`p-3 sm:p-4 text-left rounded-lg border-2 transition-all duration-200 ${
                              selectedAnswer === null
                                ? 'border-purple-600 bg-purple-800/50 hover:border-purple-400 hover:bg-purple-700/50 cursor-pointer'
                                : selectedAnswer === index
                                  ? index === currentQuestion.correctAnswer
                                    ? 'border-green-400 bg-green-500/30 text-green-100 shadow-lg shadow-green-500/20'
                                    : 'border-red-400 bg-red-500/30 text-red-100 shadow-lg shadow-red-500/20'
                                  : index === currentQuestion.correctAnswer
                                    ? 'border-green-400 bg-green-500/30 text-green-100 shadow-lg shadow-green-500/20'
                                    : 'border-purple-600 bg-purple-800/20 opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                                selectedAnswer === null
                                  ? 'border-purple-400 text-purple-300 bg-transparent'
                                  : selectedAnswer === index
                                    ? index === currentQuestion.correctAnswer
                                      ? 'border-green-300 bg-green-400 text-green-900 shadow-lg'
                                      : 'border-red-300 bg-red-400 text-red-900 shadow-lg'
                                    : index === currentQuestion.correctAnswer
                                      ? 'border-green-300 bg-green-400 text-green-900 shadow-lg'
                                      : 'border-purple-600 text-purple-500 bg-transparent'
                              }`}>
                                {String.fromCharCode(65 + index)}
                              </div>
                              <span className="flex-1 text-sm sm:text-base">{option}</span>
                              {selectedAnswer !== null && (
                                <>
                                  {selectedAnswer === index && index === currentQuestion.correctAnswer && (
                                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
                                  )}
                                  {selectedAnswer === index && index !== currentQuestion.correctAnswer && (
                                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400 flex-shrink-0" />
                                  )}
                                  {selectedAnswer !== index && index === currentQuestion.correctAnswer && (
                                    <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-400 flex-shrink-0" />
                                  )}
                                </>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  /* Results */
                  <div className="text-center py-4 sm:py-8">
                    <div className="mb-4 sm:mb-6">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap className="h-8 w-8 sm:h-10 sm:w-10 text-purple-900" />
                      </div>
                      <h3 className="text-xl sm:text-3xl font-bold mb-2">Flash Round Complete!</h3>
                      <p className="text-purple-200 text-sm sm:text-base">Great job on your rapid-fire practice</p>
                    </div>

                    <div className="bg-purple-800/50 rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
                      <div className="grid grid-cols-3 gap-2 sm:gap-4 text-center">
                        <div>
                          <div className="text-xl sm:text-2xl font-bold text-yellow-400">{score}</div>
                          <div className="text-xs sm:text-sm text-purple-200">Correct</div>
                        </div>
                        <div>
                          <div className="text-xl sm:text-2xl font-bold text-red-400">{questions.length - score}</div>
                          <div className="text-xs sm:text-sm text-purple-200">Incorrect</div>
                        </div>
                        <div>
                          <div className="text-xl sm:text-2xl font-bold text-purple-300">{Math.round((score / questions.length) * 100)}%</div>
                          <div className="text-xs sm:text-sm text-purple-200">Accuracy</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => {
                          generateNewQuestions()
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto"
                      >
                        Try Again
                      </Button>
                      <Button
                        onClick={handleClose}
                        variant="outline"
                        className="border-purple-400 text-purple-300 hover:bg-purple-700 w-full sm:w-auto"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
