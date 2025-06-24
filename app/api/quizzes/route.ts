import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    jwt.verify(token, process.env.JWT_SECRET || "banking-exam-secret-key-2024")

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
    
    return NextResponse.json(parsedQuizzes)
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
