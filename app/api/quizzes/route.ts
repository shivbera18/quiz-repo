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
    // Simple token validation (same as admin endpoints)
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Fetch all active quizzes from the database
    const quizzes = await prisma.quiz.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })
    
    // Ensure all quizzes have questions parsed as arrays
    const parsedQuizzes = quizzes.map(quiz => {
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
        ...quiz,
        questions: questionsArr,
      }
    })
    
    return NextResponse.json(parsedQuizzes, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
