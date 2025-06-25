import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any

    // Find result in database
    const dbResult = await prisma.quizResult.findFirst({
      where: { 
        id: params.id,
        userId: decoded.userId 
      },
      include: {
        quiz: {
          select: {
            title: true,
            description: true
          }
        }
      }
    })

    if (dbResult) {
      // Transform database result to match frontend format
      const result = {
        _id: dbResult.id,
        date: dbResult.date.toISOString(),
        quizName: dbResult.quiz?.title || 'Unknown Quiz',
        quizId: dbResult.quizId,
        totalScore: dbResult.totalScore,
        rawScore: (dbResult.sections as any)?.rawScore || dbResult.totalScore,
        positiveMarks: (dbResult.sections as any)?.positiveMarks || 0,
        negativeMarks: (dbResult.sections as any)?.negativeMarks || 0,
        correctAnswers: (dbResult.sections as any)?.correctAnswers || 0,
        wrongAnswers: (dbResult.sections as any)?.wrongAnswers || 0,
        unanswered: (dbResult.sections as any)?.unanswered || 0,
        sections: {
          reasoning: (dbResult.sections as any)?.reasoning || 0,
          quantitative: (dbResult.sections as any)?.quantitative || 0,
          english: (dbResult.sections as any)?.english || 0
        },
        questions: dbResult.answers || [],
        timeSpent: dbResult.timeSpent,
        negativeMarking: (dbResult.sections as any)?.negativeMarking || true,
        negativeMarkValue: (dbResult.sections as any)?.negativeMarkValue || 0.25,
        userId: dbResult.userId
      }

      return NextResponse.json({ result })
    }

    // Fallback to localStorage if not found in database
    if (typeof window !== "undefined") {
      const localResults = JSON.parse(localStorage.getItem("quizResults") || "[]")
      const result = localResults.find((r: any) => r._id === params.id && r.userId === decoded.userId)
      
      if (result) {
        return NextResponse.json({ result })
      }
    }

    return NextResponse.json({ message: "Result not found" }, { status: 404 })

  } catch (error) {
    console.error("Error fetching quiz result:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
