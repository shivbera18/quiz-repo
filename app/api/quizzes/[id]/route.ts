import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma/client"

const prisma = new PrismaClient()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Fetch quiz by ID from database
    const quiz = await prisma.quiz.findUnique({ where: { id: params.id } })
    if (!quiz) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 })
    }
    // Return quiz with complete questions and sections (including correct answers for quiz taking)
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
    
    const quizForUser = {
      ...quiz,
      questions: questionsArr,
      sections: sectionsArr,
      duration: quiz.timeLimit, // Map timeLimit to duration for compatibility
    }
    
    // Add cache-busting headers
    const response = NextResponse.json({ quiz: quizForUser })
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    return response
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
