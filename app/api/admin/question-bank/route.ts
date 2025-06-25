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
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const url = new URL(request.url)
    const section = url.searchParams.get("section")
    const difficulty = url.searchParams.get("difficulty")
    const tag = url.searchParams.get("tag")
    const search = url.searchParams.get("search")
    const page = parseInt(url.searchParams.get("page") || "1")
    const limit = parseInt(url.searchParams.get("limit") || "20")

    // Build where clause for filtering
    let whereClause: any = {}
    
    if (section) {
      whereClause.section = section
    }
    
    if (difficulty) {
      whereClause.difficulty = difficulty
    }

    if (tag) {
      whereClause.tags = {
        contains: tag
      }
    }

    if (search) {
      whereClause.OR = [
        { question: { contains: search, mode: 'insensitive' } },
        { explanation: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get total count for pagination
    const totalCount = await prisma.questionBankItem.count({ where: whereClause })

    // Fetch questions with pagination
    const questions = await prisma.questionBankItem.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    })

    // Parse JSON fields for response
    const parsedQuestions = questions.map(question => ({
      ...question,
      options: parseJsonField(question.options),
      tags: parseJsonField(question.tags),
    }))

    return NextResponse.json({
      questions: parsedQuestions,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    })
  } catch (error) {
    console.error("Question bank fetch error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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
      source
    } = await request.json()

    // Validate required fields
    if (!section || !question || !options || options.length !== 4 || typeof correctAnswer !== "number") {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    if (correctAnswer < 0 || correctAnswer > 3) {
      return NextResponse.json({ message: "Invalid correct answer index" }, { status: 400 })
    }

    // Create new question in question bank
    const newQuestion = await prisma.questionBankItem.create({
      data: {
        section,
        question: question.trim(),
        options: stringifyForDatabase(options),
        correctAnswer,
        explanation: explanation?.trim() || "",
        difficulty: difficulty || "medium",
        tags: stringifyForDatabase(tags || []),
      },
    })

    // Parse JSON fields for response
    const responseQuestion = {
      ...newQuestion,
      options: parseJsonField(newQuestion.options),
      tags: parseJsonField(newQuestion.tags),
    }

    return NextResponse.json({ question: responseQuestion })
  } catch (error) {
    console.error("Question bank create error:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
