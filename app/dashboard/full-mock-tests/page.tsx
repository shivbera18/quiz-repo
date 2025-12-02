"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { QuizList } from "@/components/quiz/quiz-list"
import { QuizFilters } from "@/components/quiz/quiz-filters"

interface Quiz {
  id: string
  title: string
  description: string
  duration: number
  sections: string[]
  questions: any[]
  isActive: boolean
  difficulty?: string
}

export default function FullMockTestsPage() {
  const { user, loading } = useAuth()
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([])
  const [attemptedQuizzes, setAttemptedQuizzes] = useState<any[]>([])
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([])
  const [activeFilters, setActiveFilters] = useState({ difficulty: "all", duration: [0, 180] })
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && user) {
      const fetchData = async () => {
        try {
          const attemptsRes = await fetch("/api/results", {
            headers: { Authorization: `Bearer ${user.token || "student-token-placeholder"}` },
          })
          const attemptsData = await attemptsRes.json()
          const attempts = attemptsData.results || []
          setAttemptedQuizzes(attempts)

          const quizzesRes = await fetch("/api/quizzes", {
            headers: { Authorization: `Bearer ${user.token || "student-token-placeholder"}` },
          })
          const quizzesData = await quizzesRes.json()

          // Parse sections if they're JSON strings
          const activeQuizzes = quizzesData
            .filter((q: Quiz) => q.isActive && q.questions?.length > 0)
            .map((quiz: any) => {
              let sections = quiz.sections
              if (typeof sections === 'string') {
                try {
                  sections = JSON.parse(sections)
                } catch {
                  sections = []
                }
              }
              return { ...quiz, sections: Array.isArray(sections) ? sections : [] }
            })

          setAvailableQuizzes(activeQuizzes)
        } catch (error) {
          console.error("Failed to fetch data:", error)
        } finally {
          setIsLoadingData(false)
        }
      }

      fetchData()
    }
  }, [loading, user])

  useEffect(() => {
    const attemptedQuizIds = attemptedQuizzes.map((attempt: any) => attempt.quizId).filter(Boolean)
    const unattemptedQuizzes = availableQuizzes.filter((quiz: Quiz) => !attemptedQuizIds.includes(quiz.id))

    console.log('Available quizzes:', availableQuizzes.length)
    console.log('Attempted quiz IDs:', attemptedQuizIds)
    console.log('Unattempted quizzes:', unattemptedQuizzes.length)

    const fullMockTests = unattemptedQuizzes.filter((q: Quiz) => {
      const sectionCount = Array.isArray(q.sections) ? q.sections.length : 0
      return sectionCount > 1
    })

    console.log('Full mock tests:', fullMockTests.length, fullMockTests)

    const filtered = fullMockTests.filter(quiz => {
      const matchDifficulty = activeFilters.difficulty === "all" ||
        !quiz.difficulty ||
        quiz.difficulty === activeFilters.difficulty
      const matchDuration = !quiz.duration || quiz.duration <= activeFilters.duration[1]

      console.log('Quiz:', quiz.title, 'Difficulty:', quiz.difficulty, 'Duration:', quiz.duration, 'Matches:', matchDifficulty && matchDuration)

      return matchDifficulty && matchDuration
    })

    console.log('Filtered quizzes:', filtered.length)
    setFilteredQuizzes(filtered)
  }, [availableQuizzes, attemptedQuizzes, activeFilters])

  if (loading || isLoadingData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 ml-14 md:ml-0 pt-1 md:pt-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Full Mock Tests</h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Comprehensive exams covering all sections</p>
        </div>
        <QuizFilters
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
        />
      </div>

      <QuizList
        quizzes={filteredQuizzes}
        emptyMessage="No full mock tests available matching your filters."
      />
    </div>
  )
}
