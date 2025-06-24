import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma/client"

const prisma = new PrismaClient()

// Mock quizzes database
const quizzes: any[] = []

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Simple token validation
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Calculate analytics for each quiz
    const quizzes = await prisma.quiz.findMany({ include: { results: true } })
    const quizAnalytics = quizzes.map((quiz) => {
      const attempts = quiz.results.length
      const avgScore = attempts > 0 ? Math.round(quiz.results.reduce((sum, r) => sum + r.totalScore, 0) / attempts) : 0
      const avgTime = attempts > 0 ? Math.round(quiz.results.reduce((sum, r) => sum + r.timeSpent, 0) / attempts) : 0
      // Most missed question logic can be added if questions are normalized
      return {
        id: quiz.id,
        title: quiz.title,
        attempts,
        avgScore,
        avgTime,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
      }
    })

    // Load quizzes from localStorage simulation (this won't work in API routes, but keeping for consistency)
    return NextResponse.json({ quizzes: quizAnalytics })
  } catch (error) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Simple token validation
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const { title, description, duration, sections } = await request.json()

    // Save new quiz to the database using Prisma
    const createdQuiz = await prisma.quiz.create({
      data: {
        title,
        description,
        timeLimit: duration, // assuming your schema uses timeLimit
        sections,
        isActive: true,
        createdAt: new Date(),
        createdBy: "admin",
      },
    })

    return NextResponse.json({ quiz: createdQuiz })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
