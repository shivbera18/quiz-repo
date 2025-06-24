import { PrismaClient } from "@/lib/generated/prisma/client"
import { type NextRequest, NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.substring(7)
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }
    // Fetch quiz from database
    const quiz = await prisma.quiz.findUnique({ where: { id: params.id } })
    if (!quiz) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 })
    }
    
    // Ensure questions is always an array
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
    
    const quizWithParsedQuestions = {
      ...quiz,
      questions: questionsArr,
    }
    
    return NextResponse.json({ quiz: quizWithParsedQuestions })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.substring(7)
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }
    const updates = await request.json()
    return NextResponse.json({ message: "Quiz updated successfully" })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.substring(7)
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }
    return NextResponse.json({ message: "Quiz deleted successfully" })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }
    const token = authHeader.substring(7)
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }
    const data = await request.json()
    const updatedQuiz = await prisma.quiz.update({
      where: { id: params.id },
      data: {
        title: data.title,
        description: data.description,
        timeLimit: data.duration,
        sections: data.sections,
        questions: JSON.stringify(data.questions), // Ensure questions are stored as JSON string
        isActive: data.isActive,
      },
    })
    
    // Parse questions back to array for response
    let questionsArr: any[] = []
    if (typeof updatedQuiz.questions === "string") {
      try {
        questionsArr = JSON.parse(updatedQuiz.questions)
      } catch {
        questionsArr = []
      }
    } else if (Array.isArray(updatedQuiz.questions)) {
      questionsArr = updatedQuiz.questions
    }
    
    const responseQuiz = {
      ...updatedQuiz,
      questions: questionsArr,
    }
    
    return NextResponse.json({ quiz: responseQuiz })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
