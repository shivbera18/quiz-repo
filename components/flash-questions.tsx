"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, Zap, Check, AlertCircle, ChevronLeft, ChevronRight, Timer, RotateCcw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface Question {
  id: string
  question: string
  answer: number
  options: string[]
    correctOptionIndex: number
  operation: string
  difficulty: "2-digit" | "3-digit"
}

interface FlashQuestionsProps {
  isOpen: boolean
  onClose: () => void
}

const operations = ["Addition", "Subtraction", "Multiplication", "Division"]

// Generate arithmetic questions using Gemini API
const generateQuestionsWithGemini = async (
  operation: string, 
  difficulty: "2-digit" | "3-digit" | "mixed", 
  count: number = 10
): Promise<Question[]> => {
  try {
    const prompt = difficulty === "mixed" 
      ? `Generate ${count} simple ${operation.toLowerCase()} problems mixing 2-digit and 3-digit numbers for speed calculation practice. For each problem, also generate 4 multiple choice options (3 wrong answers + 1 correct). Return only the problems in JSON format as an array of objects with: {question: "12 + 45", answer: 57, options: ["54", "57", "59", "62"], correctOptionIndex: 1, operation: "${operation}", difficulty: "2-digit" or "3-digit"}. Keep numbers reasonable for mental math and make wrong options plausible.`
      : `Generate ${count} simple ${operation.toLowerCase()} problems using ${difficulty} numbers for speed calculation practice. For each problem, also generate 4 multiple choice options (3 wrong answers + 1 correct). Return only the problems in JSON format as an array of objects with: {question: "12 + 45", answer: 57, options: ["54", "57", "59", "62"], correctOptionIndex: 1, operation: "${operation}", difficulty: "${difficulty}"}. Keep numbers reasonable for mental math and make wrong options plausible.`

    const response = await fetch('/api/generate-flashcards', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        prompt,
        operation,
        difficulty,
        count 
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to generate questions')
    }

    const data = await response.json()
    const questions = data.questions || []
    
    // Ensure all questions have proper options array
    return questions.map((q: any, index: number) => {
      if (!q.options || !Array.isArray(q.options) || q.options.length !== 4) {
        // Generate options locally if API didn't provide them
        const localQ = generateLocalQuestions(q.operation || operation, q.difficulty || difficulty, 1)[0]
        return {
          ...q,
          options: localQ.options,
          correctOptionIndex: localQ.correctOptionIndex
        }
      }
      
      // Validate that the correct option index is actually correct
      const correctOptionIndex = q.correctOptionIndex || 0
      const correctAnswer = q.answer?.toString()
      
      if (!correctAnswer || q.options[correctOptionIndex] !== correctAnswer) {
        const actualCorrectIndex = q.options.findIndex((opt: string) => opt === correctAnswer)
        return {
          ...q,
          correctOptionIndex: actualCorrectIndex >= 0 ? actualCorrectIndex : 0
        }
      }
      
      return q
    })
  } catch (error) {
    console.error('Error generating questions with Gemini:', error)
    // Fallback to local generation
    return generateLocalQuestions(operation, difficulty, count)
  }
}

// Fallback local question generation
const generateLocalQuestions = (
  operation: string, 
  difficulty: "2-digit" | "3-digit" | "mixed", 
  count: number = 10
): Question[] => {
  const questions: Question[] = []
  
  for (let i = 0; i < count; i++) {
    const currentDifficulty = difficulty === "mixed" 
      ? Math.random() > 0.5 ? "2-digit" : "3-digit"
      : difficulty as "2-digit" | "3-digit"
    
    const range = currentDifficulty === "2-digit" ? [10, 99] : [100, 999]
    let question = ""
    let answer = 0
    
    switch (operation) {
      case "Addition": {
        const a = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]
        const b = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]
        answer = a + b
        question = `${a} + ${b}`
        break
      }
      case "Subtraction": {
        const a = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0]
        const b = Math.floor(Math.random() * a) + (range[0] / 2) // Ensure positive result
        answer = a - b
        question = `${a} - ${b}`
        break
      }
      case "Multiplication": {
        const maxRange = currentDifficulty === "2-digit" ? [2, 25] : [2, 50]
        const a = Math.floor(Math.random() * (maxRange[1] - maxRange[0] + 1)) + maxRange[0]
        const b = Math.floor(Math.random() * (maxRange[1] - maxRange[0] + 1)) + maxRange[0]
        answer = a * b
        question = `${a} × ${b}`
        break
      }
      case "Division": {
        const divisor = Math.floor(Math.random() * 20) + 2
        const quotient = currentDifficulty === "2-digit" 
          ? Math.floor(Math.random() * 50) + 2
          : Math.floor(Math.random() * 200) + 2
        const dividend = divisor * quotient
        answer = quotient
        question = `${dividend} ÷ ${divisor}`
        break
      }
    }
    
    // Generate 4 options with one correct answer
    const options: string[] = []
    
    // Generate 3 wrong answers first
    const wrongAnswers = new Set<number>()
    let attempts = 0
    while (wrongAnswers.size < 3 && attempts < 50) {
      let wrongAnswer: number
      const variance = Math.floor(Math.random() * 21) - 10 // -10 to +10
      
      switch (operation) {
        case "Addition":
          // For addition, generate answers that are close but wrong
          wrongAnswer = answer + variance
          if (variance === 0) wrongAnswer = answer + (Math.random() > 0.5 ? 5 : -5)
          break
        case "Subtraction":
          wrongAnswer = answer + variance
          if (variance === 0) wrongAnswer = answer + (Math.random() > 0.5 ? 3 : -3)
          break
        case "Multiplication":
          // For multiplication, generate more varied wrong answers
          const multVariance = Math.floor(Math.random() * 51) - 25 // -25 to +25
          wrongAnswer = answer + multVariance
          if (multVariance === 0) wrongAnswer = answer + (Math.random() > 0.5 ? 10 : -10)
          break
        case "Division":
          wrongAnswer = answer + Math.floor(Math.random() * 11) - 5 // -5 to +5
          if (wrongAnswer === answer) wrongAnswer = answer + (Math.random() > 0.5 ? 2 : -2)
          break
        default:
          wrongAnswer = answer + variance
          if (variance === 0) wrongAnswer = answer + (Math.random() > 0.5 ? 5 : -5)
      }
      
      // Ensure wrong answer is positive and different from correct answer
      if (wrongAnswer > 0 && wrongAnswer !== answer && !wrongAnswers.has(wrongAnswer)) {
        wrongAnswers.add(wrongAnswer)
      }
      attempts++
    }
    
    // If we still don't have 3 wrong answers, add some basic ones
    while (wrongAnswers.size < 3) {
      const baseWrong = answer + (wrongAnswers.size + 1) * (Math.random() > 0.5 ? 1 : -1)
      if (baseWrong > 0 && baseWrong !== answer && !wrongAnswers.has(baseWrong)) {
        wrongAnswers.add(baseWrong)
      }
    }
    
    // Add all wrong answers to options array
    wrongAnswers.forEach(wa => options.push(wa.toString()))
    
    // Add correct answer to options array
    options.push(answer.toString())
    
    // Shuffle all options
    const shuffledOptions = [...options].sort(() => Math.random() - 0.5)
    
    // Find the index of the correct answer after shuffling
    const correctOptionIndex = shuffledOptions.findIndex(option => parseInt(option) === answer)
    
    questions.push({
      id: `${operation}-${currentDifficulty}-${i}`,
      question,
      answer,
      options: shuffledOptions,
      correctOptionIndex,
      operation,
      difficulty: currentDifficulty
    })
  }
  
  return questions
}

export function FlashQuestions({ isOpen, onClose }: FlashQuestionsProps) {
  const [currentSection, setCurrentSection] = useState<"2-digit" | "3-digit" | "mixed">("2-digit")
  const [currentOperation, setCurrentOperation] = useState("Addition")
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState("")
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [totalAnswered, setTotalAnswered] = useState(0)
  const [loading, setLoading] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [questionStartTime, setQuestionStartTime] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showFinalResults, setShowFinalResults] = useState(false)
  const [answerHistory, setAnswerHistory] = useState<Array<{
    question: string
    userAnswer: string
    correctAnswer: string
    isCorrect: boolean
    timeTaken: number
  }>>([])

  const currentQuestion = questions[currentQuestionIndex]
  const totalQuestions = 15

  // Generate questions when section or operation changes
  useEffect(() => {
    if (isOpen) {
      generateQuestions()
    }
  }, [isOpen, currentSection, currentOperation])

  // Start timer when question appears
  useEffect(() => {
    if (currentQuestion && !showAnswer) {
      setQuestionStartTime(Date.now())
    }
  }, [currentQuestionIndex, showAnswer])

  const generateQuestions = async () => {
    setIsGenerating(true)
    setLoading(true)
    try {
      const newQuestions = await generateQuestionsWithGemini(currentOperation, currentSection, totalQuestions)
      setQuestions(newQuestions)
      setCurrentQuestionIndex(0)
      setUserAnswer("")
      setSelectedOption(null)
      setShowAnswer(false)
      setScore(0)
      setTotalAnswered(0)
      setShowFinalResults(false)
      setAnswerHistory([])
      setStartTime(Date.now())
    } catch (error) {
      console.error('Error generating questions:', error)
    } finally {
      setLoading(false)
      setIsGenerating(false)
    }
  }

  const handleOptionSelect = (optionIndex: number) => {
    if (showAnswer) return
    setSelectedOption(optionIndex)
    
    // Calculate time taken for this question
    const timeTaken = questionStartTime ? Date.now() - questionStartTime : 0
    
    // Automatically submit the answer when option is selected
    const isCorrect = optionIndex === currentQuestion.correctOptionIndex
    const selectedAnswer = currentQuestion.options[optionIndex]
    
    // Add to answer history
    const newAnswerRecord = {
      question: currentQuestion.question,
      userAnswer: selectedAnswer,
      correctAnswer: currentQuestion.answer.toString(),
      isCorrect,
      timeTaken: Math.floor(timeTaken / 1000) // Convert to seconds
    }
    
    setAnswerHistory(prev => [...prev, newAnswerRecord])
    
    if (isCorrect) {
      setScore(prev => prev + 1)
    }
    
    setTotalAnswered(prev => prev + 1)
    setShowAnswer(true)
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
      setUserAnswer("")
      setSelectedOption(null)
      setShowAnswer(false)
    } else {
      // End of questions, show final results
      setShowFinalResults(true)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      setUserAnswer("")
      setSelectedOption(null)
      setShowAnswer(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && showAnswer) {
      handleNext()
    } else if (!showAnswer && ['1', '2', '3', '4'].includes(e.key)) {
      const optionIndex = parseInt(e.key) - 1
      if (optionIndex >= 0 && optionIndex < 4 && currentQuestion?.options) {
        handleOptionSelect(optionIndex)
      }
    } else if (!showAnswer && ['a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
      const optionIndex = e.key.toLowerCase().charCodeAt(0) - 97
      if (optionIndex >= 0 && optionIndex < 4 && currentQuestion?.options) {
        handleOptionSelect(optionIndex)
      }
    }
  }

  const resetSession = () => {
    setScore(0)
    setTotalAnswered(0)
    setCurrentQuestionIndex(0)
    setUserAnswer("")
    setSelectedOption(null)
    setShowAnswer(false)
    setShowFinalResults(false)
    setAnswerHistory([])
    setStartTime(Date.now())
    generateQuestions()
  }

  const getElapsedTime = () => {
    if (!startTime) return 0
    return Math.floor((Date.now() - startTime) / 1000)
  }

  const getQuestionTime = () => {
    if (!questionStartTime) return 0
    return Math.floor((Date.now() - questionStartTime) / 1000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4">
      <div className="relative w-full max-w-4xl mx-auto max-h-screen overflow-y-auto">
        <Card className="neu-card bg-gradient-to-br from-card via-card to-background/95 border border-border/20" 
              onKeyDown={handleKeyPress} 
              tabIndex={0}>
          <CardContent className="p-3 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="neu-icon-button p-2 sm:p-3">
                  <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold neu-text-gradient">Speed Calculation</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm">Click any option for instant results</p>
                  <p className="text-muted-foreground text-xs hidden sm:block">Use A/B/C/D or 1/2/3/4 keys</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="neu-button h-8 w-8 sm:h-10 sm:w-10"
              >
                <X className="h-4 w-4 sm:h-6 sm:w-6" />
              </Button>
            </div>

            {/* Section Selector */}
            <div className="flex flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-6">
              {(["2-digit", "3-digit", "mixed"] as const).map((section) => (
                <Button
                  key={section}
                  variant={currentSection === section ? "default" : "outline"}
                  onClick={() => setCurrentSection(section)}
                  className={`${currentSection === section ? "neu-button-active" : "neu-button"} text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2`}
                  disabled={isGenerating}
                >
                  {section === "mixed" ? "Mixed" : `${section.split('-')[0]}D`}
                </Button>
              ))}
            </div>

            {/* Operation Selector */}
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1 sm:gap-2 mb-4 sm:mb-6">
              {operations.map((operation) => (
                <Button
                  key={operation}
                  variant={currentOperation === operation ? "default" : "outline"}
                  onClick={() => setCurrentOperation(operation)}
                  className={`${currentOperation === operation ? "neu-button-active" : "neu-button"} text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2`}
                  disabled={isGenerating}
                >
                  {operation.charAt(0) + operation.slice(1, 4)}
                </Button>
              ))}
            </div>

            {/* Stats */}
            {!showFinalResults && (
              <>
                {/* Progress Bar */}
                <div className="mb-4 sm:mb-6">
                  <div className="flex justify-between text-xs sm:text-sm text-muted-foreground mb-2">
                    <span>Progress</span>
                    <span>{totalAnswered} / {totalQuestions}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(totalAnswered / totalQuestions) * 100}%` }}
                    ></div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
                  <div className="bg-card/50 border border-border rounded-lg p-2 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-primary">{score}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Correct</div>
                  </div>
                  <div className="bg-card/50 border border-border rounded-lg p-2 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-accent">{totalAnswered}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Answered</div>
                  </div>
                  <div className="bg-card/50 border border-border rounded-lg p-2 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-purple-600">
                      {totalAnswered > 0 ? Math.round((score / totalAnswered) * 100) : 0}%
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Accuracy</div>
                  </div>
                  <div className="bg-card/50 border border-border rounded-lg p-2 sm:p-4 text-center">
                    <div className="text-lg sm:text-2xl font-bold text-orange-600">{getElapsedTime()}s</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Total Time</div>
                  </div>
                </div>
              </>
            )}

            {/* Question Area */}
            {showFinalResults ? (
              <div className="neu-card p-4 sm:p-8 mb-4 sm:mb-6">
                <div className="text-center mb-6">
                  <h3 className="text-2xl sm:text-3xl font-bold neu-text-gradient mb-4">Quiz Complete!</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    <div className="bg-card/50 border border-border rounded-lg p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-primary">{score}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Correct</div>
                    </div>
                    <div className="bg-card/50 border border-border rounded-lg p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-red-500">{totalQuestions - score}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Incorrect</div>
                    </div>
                    <div className="bg-card/50 border border-border rounded-lg p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-purple-600">
                        {Math.round((score / totalQuestions) * 100)}%
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Accuracy</div>
                    </div>
                    <div className="bg-card/50 border border-border rounded-lg p-3 text-center">
                      <div className="text-xl sm:text-2xl font-bold text-orange-600">{getElapsedTime()}s</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Total Time</div>
                    </div>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="max-h-64 sm:max-h-80 overflow-y-auto mb-6">
                  <h4 className="text-lg font-semibold mb-3">Detailed Results:</h4>
                  <div className="space-y-2">
                    {answerHistory.map((record, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border text-sm flex items-center justify-between ${
                          record.isCorrect
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-red-50 border-red-200 text-red-800"
                        }`}
                      >
                        <div className="flex-1">
                          <span className="font-medium">{record.question} = </span>
                          <span className={record.isCorrect ? "text-green-700" : "text-red-700"}>
                            {record.userAnswer}
                          </span>
                          {!record.isCorrect && (
                            <span className="text-green-700"> (Correct: {record.correctAnswer})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{record.timeTaken}s</span>
                          {record.isCorrect ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button onClick={resetSession} className="neu-button flex-1">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  <Button onClick={onClose} variant="outline" className="neu-button flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Close
                  </Button>
                </div>
              </div>
            ) : loading || isGenerating ? (
              <div className="flex items-center justify-center py-10 sm:py-20">
                <div className="text-center">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground text-sm sm:text-base">Generating questions...</p>
                </div>
              </div>
            ) : currentQuestion ? (
              <div className="neu-card p-4 sm:p-8 mb-4 sm:mb-6">
                <div className="text-center mb-4 sm:mb-6">
                  <Badge variant="outline" className="mb-2 sm:mb-4 text-xs sm:text-sm">
                    {currentQuestion.operation} • {currentQuestion.difficulty}
                  </Badge>
                  <div className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4 neu-text-gradient">
                    {currentQuestion.question}
                  </div>
                  <div className="text-sm sm:text-lg text-muted-foreground mb-2 sm:mb-4">
                    Question {currentQuestionIndex + 1} of {totalQuestions}
                  </div>
                  {questionStartTime && !showAnswer && (
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      <Timer className="inline h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                      {getQuestionTime()}s
                    </div>
                  )}
                </div>

                <div className="max-w-lg mx-auto">
                  {!showAnswer ? (
                    <div className="space-y-3 sm:space-y-4">
                      {/* Multiple Choice Options */}
                      <div className="grid grid-cols-1 gap-2 sm:gap-3">
                        {currentQuestion.options && currentQuestion.options.length === 4 ? (
                          currentQuestion.options.map((option, index) => (
                            <Button
                              key={index}
                              variant={selectedOption === index ? "default" : "outline"}
                              onClick={() => handleOptionSelect(index)}
                              className={`neu-button h-12 sm:h-14 text-base sm:text-lg font-medium transition-all ${
                                selectedOption === index ? "neu-button-active" : ""
                              }`}
                              disabled={showAnswer}
                            >
                              <span className="mr-2 sm:mr-3 w-6 h-6 sm:w-8 sm:h-8 rounded-full border border-current flex items-center justify-center text-xs sm:text-sm font-bold">
                                {String.fromCharCode(65 + index)}
                              </span>
                              {option}
                            </Button>
                          ))
                        ) : (
                          <div className="text-center py-6 sm:py-8">
                            <p className="text-muted-foreground text-sm sm:text-base">Loading options...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-3 sm:space-y-4">
                      <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                        <div className="text-lg sm:text-2xl">
                          Your answer: <span className="font-bold">
                            {selectedOption !== null ? currentQuestion.options[selectedOption] : "None"}
                          </span>
                        </div>
                        {selectedOption === currentQuestion.correctOptionIndex ? (
                          <Check className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                        ) : (
                          <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                        )}
                      </div>
                      <div className="text-base sm:text-xl text-muted-foreground">
                        Correct answer: <span className="font-bold text-primary">{currentQuestion.answer}</span>
                      </div>
                      {/* Show all options with correct/incorrect styling */}
                      <div className="space-y-2 mt-3 sm:mt-4">
                        {currentQuestion.options && currentQuestion.options.length === 4 ? (
                          currentQuestion.options.map((option, index) => (
                            <div
                              key={index}
                              className={`p-2 sm:p-3 rounded-lg border text-left flex items-center gap-2 sm:gap-3 ${
                                index === currentQuestion.correctOptionIndex
                                  ? "bg-green-50 border-green-200 text-green-800"
                                  : index === selectedOption
                                  ? "bg-red-50 border-red-200 text-red-800"
                                  : "bg-muted/50 border-border text-muted-foreground"
                              }`}
                            >
                              <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center text-xs font-bold">
                                {String.fromCharCode(65 + index)}
                              </span>
                              <span className="text-sm sm:text-base">{option}</span>
                              {index === currentQuestion.correctOptionIndex && (
                                <Check className="h-3 w-3 sm:h-4 sm:w-4 ml-auto text-green-600" />
                              )}
                              {index === selectedOption && index !== currentQuestion.correctOptionIndex && (
                                <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 ml-auto text-red-600" />
                              )}
                            </div>
                          ))
                        ) : null}
                      </div>
                      <Button onClick={handleNext} className="neu-button w-full py-2 sm:py-3 text-sm sm:text-base">
                        {currentQuestionIndex < totalQuestions - 1 ? "Next Question" : "Show Results"}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {/* Navigation */}
            {!showFinalResults && (
              <div className="flex justify-between items-center gap-2 sm:gap-4">
                <Button
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0 || isGenerating}
                  variant="outline"
                  className="neu-button flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-4 py-2"
                >
                  <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Previous
                </Button>

                <Button
                  onClick={resetSession}
                  disabled={isGenerating}
                  variant="outline" 
                  className="neu-button flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-4 py-2"
                >
                  <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Reset
                </Button>

                <Button
                  onClick={handleNext}
                  disabled={!showAnswer || isGenerating}
                  variant="outline"
                  className="neu-button flex-1 sm:flex-none text-xs sm:text-sm px-2 sm:px-4 py-2"
                >
                  {currentQuestionIndex < totalQuestions - 1 ? "Next" : "Results"}
                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 ml-1 sm:ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
