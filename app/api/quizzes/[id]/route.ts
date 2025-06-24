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
    // Return quiz with questions (without correct answers for users)
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
    const quizForUser = {
      ...quiz,
      questions: questionsArr.map((q: any) => ({
        id: q.id,
        section: q.section,
        question: q.question,
        options: q.options,
      })),
    }
    return NextResponse.json({ quiz: quizForUser })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
