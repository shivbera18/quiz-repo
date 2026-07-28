import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get user details and all their quiz results
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        quizHistory: {
          include: {
            quiz: true
          },
          orderBy: {
            date: 'desc'
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Group results by quiz
    const quizPerformance = user.quizHistory.reduce((acc: any, result) => {
      const quizId = result.quizId
      const quizTitle = result.quiz?.title || "Unknown Quiz"
      
      if (!acc[quizId]) {
        acc[quizId] = {
          quizId,
          quizTitle,
          attempts: [],
          bestScore: 0,
          averageScore: 0,
          totalAttempts: 0,
          averageTime: 0
        }
      }
      
      let answers: any[] = []
      try {
        if (result.answers) {
          answers = JSON.parse(result.answers)
        }
      } catch {
        // leave answers empty if malformed
      }

      acc[quizId].attempts.push({
        id: result.id,
        date: result.date,
        totalScore: result.totalScore,
        correctAnswers: answers.filter((a) => a.isCorrect === true).length,
        wrongAnswers: answers.filter((a) => a.isCorrect === false && a.userAnswer !== null && a.userAnswer !== undefined).length,
        unanswered: answers.filter((a) => a.isUnanswered === true || a.userAnswer === null || a.userAnswer === undefined).length,
        timeSpent: result.timeSpent,
        sections: result.sections
      })
      
      acc[quizId].totalAttempts++
      acc[quizId].bestScore = Math.max(acc[quizId].bestScore, result.totalScore)
      
      return acc
    }, {})

    // Calculate averages
    Object.values(quizPerformance).forEach((quiz: any) => {
      const totalScore = quiz.attempts.reduce((sum: number, attempt: any) => sum + attempt.totalScore, 0)
      const totalTime = quiz.attempts.reduce((sum: number, attempt: any) => sum + (attempt.timeSpent || 0), 0)
      
      quiz.averageScore = Math.round(totalScore / quiz.totalAttempts)
      quiz.averageTime = Math.round(totalTime / quiz.totalAttempts)
    })

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        totalQuizzes: user.totalQuizzes,
        averageScore: user.averageScore
      },
      quizPerformance: Object.values(quizPerformance)
    })

  } catch (error) {
    console.error("Error fetching user performance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
