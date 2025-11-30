import { prisma } from "@/lib/prisma"
import { type NextRequest, NextResponse } from "next/server"
import { parseJsonField, stringifyForDatabase } from "@/lib/database-utils"

export const dynamic = 'force-dynamic'

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
    
    // Ensure questions and sections are always arrays
    const questionsArr = parseJsonField(quiz.questions);
    const sectionsArr = parseJsonField(quiz.sections);
    
    const quizWithParsedData = {
      ...quiz,
      questions: questionsArr,
      sections: sectionsArr,
    }
    
    return NextResponse.json({ quiz: quizWithParsedData })
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
    
    // Delete quiz results first (foreign key constraint)
    await prisma.quizResult.deleteMany({
      where: { quizId: params.id }
    })
    
    // Delete the quiz
    await prisma.quiz.delete({
      where: { id: params.id }
    })
    
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
    // Only update chapterId if a valid value is provided
    const updateData: any = {
      title: data.title,
      description: data.description,
      timeLimit: data.duration,
      sections: JSON.stringify(data.sections),
      questions: JSON.stringify(data.questions),
      isActive: data.isActive,
      negativeMarking: data.negativeMarking,
      negativeMarkValue: data.negativeMarkValue,
    };
    if (data.chapterId && data.chapterId !== "none" && data.chapterId.trim() !== "") {
      updateData.chapterId = data.chapterId;
    }
    // If you also want to protect subjectId, add similar logic here
    const updatedQuiz = await prisma.quiz.update({
      where: { id: params.id },
      data: updateData,
    })
    
    // Parse questions and sections back to arrays for response
    const questionsArr = parseJsonField(updatedQuiz.questions);
    const sectionsArr = parseJsonField(updatedQuiz.sections);
    
    const responseQuiz = {
      ...updatedQuiz,
      questions: questionsArr,
      sections: sectionsArr,
    }
    
    return NextResponse.json({ quiz: responseQuiz })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
