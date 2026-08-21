"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { QuizList } from "@/components/quiz/quiz-list"
import { QuizFilters } from "@/components/quiz/quiz-filters"
import { MobilePageHeader } from "@/components/layout/mobile-page-header"

interface Quiz {
  id: string
  title: string
  description: string
  timeLimitSec: number
  sectionNames: string[]
  questionCount: number
  isActive: boolean
}

export default function SectionalTestsPage() {
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

          const activeQuizzes = quizzesData.filter((q: Quiz) => q.isActive && q.questionCount > 0)

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
    const sectionalTests = unattemptedQuizzes.filter((q: Quiz) => q.sectionNames.length === 1)

    const filtered = sectionalTests.filter(quiz => quiz.timeLimitSec / 60 <= activeFilters.duration[1])

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
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile & Desktop Header with Filters action */}
      <MobilePageHeader 
        title="Sectional Tests" 
        subtitle="Focused practice on specific topics"
        backHref="/dashboard"
        action={
          <QuizFilters
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
          />
        }
        mobileAction={
          <QuizFilters
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
            iconOnly
          />
        }
      />

      <QuizList
        quizzes={filteredQuizzes}
        emptyMessage="No sectional tests available matching your filters."
      />
    </div>
  )
}
