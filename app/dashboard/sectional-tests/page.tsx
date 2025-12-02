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
    const sectionalTests = unattemptedQuizzes.filter((q: Quiz) => {
      const sectionCount = Array.isArray(q.sections) ? q.sections.length : 0
      return sectionCount === 1
    })

    const filtered = sectionalTests.filter(quiz => {
      const matchDifficulty = activeFilters.difficulty === "all" ||
        !quiz.difficulty ||
        quiz.difficulty === activeFilters.difficulty
      const matchDuration = !quiz.duration || quiz.duration <= activeFilters.duration[1]
      return matchDifficulty && matchDuration
    })

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-lg h-11 w-11 border-2 border-black dark:border-white shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.15)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] bg-white dark:bg-zinc-900 transition-all"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Sectional Tests</h1>
            <p className="text-sm text-muted-foreground mt-1 font-medium">Focused practice on specific topics</p>
          </div>
        </div>
        <QuizFilters
          activeFilters={activeFilters}
          onFilterChange={setActiveFilters}
        />
      </div>

      <QuizList
        quizzes={filteredQuizzes}
        emptyMessage="No sectional tests available matching your filters."
      />
    </div>
  )
}
