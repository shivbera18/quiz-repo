import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma/client"

const prisma = new PrismaClient()

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
      
      // Parse questions to ensure it's always an array
      let questionsArr: any[] = []
      if (typeof quiz.questions === "string") {
        try {
          questionsArr = JSON.parse(quiz.questions)
        } catch {
          questionsArr = []
        }
      } else if (Array.isArray(quiz.questions)) {
        questionsArr = quiz.questions
      }
      
      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.timeLimit,
        sections: quiz.sections,
        questions: questionsArr,
        isActive: quiz.isActive,
        createdAt: quiz.createdAt.toISOString(),
        createdBy: quiz.createdBy,
        negativeMarking: true, // Default values for missing fields
        negativeMarkValue: 0.25,
        attempts,
        avgScore,
        avgTime,
        startTime: quiz.startTime,
        endTime: quiz.endTime,
      }
    })

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

    const { title, description, duration, sections, questions } = await request.json()

    // Save new quiz to the database using Prisma
    const createdQuiz = await prisma.quiz.create({
      data: {
        title,
        description,
        timeLimit: duration, // assuming your schema uses timeLimit
        sections,
        questions: JSON.stringify(questions || []), // Ensure questions are stored as JSON string
        isActive: true,
        createdAt: new Date(),
        createdBy: "admin",
      },
    })

    // Parse questions back to array for response
    let questionsArr: any[] = []
    if (typeof createdQuiz.questions === "string") {
      try {
        questionsArr = JSON.parse(createdQuiz.questions)
      } catch {
        questionsArr = []
      }
    } else if (Array.isArray(createdQuiz.questions)) {
      questionsArr = createdQuiz.questions
    }
    
    const responseQuiz = {
      ...createdQuiz,
      questions: questionsArr,
    }

    return NextResponse.json({ quiz: responseQuiz })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
