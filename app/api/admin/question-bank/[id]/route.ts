import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
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

    const question = await prisma.questionBankItem.findUnique({
      where: { id: params.id }
    })

    if (!question) {
      return NextResponse.json({ message: "Question not found" }, { status: 404 })
    }

    // Parse JSON fields for response
    const responseQuestion = {
      ...question,
      options: parseJsonField(question.options),
      tags: parseJsonField(question.tags),
    }

    return NextResponse.json({ question: responseQuestion })
  } catch (error) {
    console.error("Question bank get error:", error)
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

    const {
      section,
      question,
      options,
      correctAnswer,
      explanation,
      difficulty,
      tags,
      image,
      source,
      isVerified
    } = await request.json()

    // Validate required fields
    if (!section || !question || !options || options.length !== 4 || typeof correctAnswer !== "number") {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    if (correctAnswer < 0 || correctAnswer > 3) {
      return NextResponse.json({ message: "Invalid correct answer index" }, { status: 400 })
    }

    // Update question in question bank
    const updatedQuestion = await prisma.questionBankItem.update({
      where: { id: params.id },
      data: {
        section,
        question: question.trim(),
        options: stringifyForDatabase(options),
        correctAnswer,
        explanation: explanation?.trim() || "",
        difficulty: difficulty || "medium",
        tags: stringifyForDatabase(tags || []),
        updatedAt: new Date(),
      },
    })

    // Parse JSON fields for response
    const responseQuestion = {
      ...updatedQuestion,
      options: parseJsonField(updatedQuestion.options),
      tags: parseJsonField(updatedQuestion.tags),
    }

    return NextResponse.json({ question: responseQuestion })
  } catch (error) {
    console.error("Question bank update error:", error)
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

    await prisma.questionBankItem.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ message: "Question deleted successfully" })
  } catch (error) {
    console.error("Question bank delete error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
