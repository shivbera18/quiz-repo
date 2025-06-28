import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"
import { parseJsonField, stringifyForDatabase } from "@/lib/database-utils"

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
      
      // Parse questions and sections to ensure they're always arrays
      const questionsArr = parseJsonField(quiz.questions);
      const sectionsArr = parseJsonField(quiz.sections);
      
      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.timeLimit,
        chapterId: quiz.chapterId,
        sections: sectionsArr,
        questions: questionsArr,
        isActive: quiz.isActive,
        createdAt: quiz.createdAt.toISOString(),
        createdBy: quiz.createdBy,
        negativeMarking: quiz.negativeMarking,
        negativeMarkValue: quiz.negativeMarkValue,
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

    const { title, description, duration, chapterId, sections, questions, negativeMarking, negativeMarkValue } = await request.json()

    // Save new quiz to the database using Prisma
    const createdQuiz = await prisma.quiz.create({
      data: {
        title,
        description,
        timeLimit: duration,
        chapterId: chapterId || null,
        sections: stringifyForDatabase(sections),
        questions: stringifyForDatabase(questions || []),
        isActive: true,
        createdBy: "admin",
        negativeMarking: negativeMarking ?? true,
        negativeMarkValue: negativeMarkValue ?? 0.25,
        // Remove createdAt - it's handled automatically by Prisma @default(now())
      },
    })

    // Parse questions and sections back to arrays for response
    const questionsArr = parseJsonField(createdQuiz.questions);
    const sectionsArr = parseJsonField(createdQuiz.sections);
    
    const responseQuiz = {
      ...createdQuiz,
      questions: questionsArr,
      sections: sectionsArr,
    }

    return NextResponse.json({ quiz: responseQuiz })
  } catch (error) {
    console.error("Error creating quiz:", error)
    
    // Type-safe error handling
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorCode = (error as any)?.code
    
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: errorMessage,
      code: errorCode
    })
    
    // Provide more specific error messages
    if (errorCode === 'P2002') {
      return NextResponse.json({ 
        message: "Quiz with this title already exists",
        error: "Unique constraint violation" 
      }, { status: 400 })
    }
    
    if (errorCode === 'P2003') {
      return NextResponse.json({ 
        message: "Invalid chapter ID provided",
        error: "Foreign key constraint violation" 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      message: "Failed to create quiz in database",
      error: errorMessage
    }, { status: 500 })
  }
}
