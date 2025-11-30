import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
    
    // Ensure all quizzes have questions and sections parsed as arrays
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
      
      let sectionsArr: string[] = []
      if (typeof quiz.sections === "string") {
        try {
          sectionsArr = JSON.parse(quiz.sections)
        } catch {
          sectionsArr = []
        }
      } else if (Array.isArray(quiz.sections)) {
        sectionsArr = quiz.sections
      }
      
      return {
        ...quiz,
        questions: questionsArr,
        sections: sectionsArr,
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
