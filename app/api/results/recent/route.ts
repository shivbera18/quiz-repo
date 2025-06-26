import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

// Force this route to be dynamic (not statically rendered)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any

    // Get recent results from database
    const dbResults = await prisma.quizResult.findMany({
      where: { userId: decoded.userId },
      include: {
        quiz: {
          select: {
            title: true,
            description: true
          }
        }
      },
      orderBy: { date: 'desc' },
      take: 5
    })

    // Transform database results to match frontend format
    const userResults = dbResults.map(result => ({
      _id: result.id,
      date: result.date.toISOString(),
      quizName: result.quiz?.title || 'Unknown Quiz',
      quizId: result.quizId,
      totalScore: result.totalScore,
      rawScore: (result.sections as any)?.rawScore || result.totalScore,
      positiveMarks: (result.sections as any)?.positiveMarks || 0,
      negativeMarks: (result.sections as any)?.negativeMarks || 0,
      correctAnswers: (result.sections as any)?.correctAnswers || 0,
      wrongAnswers: (result.sections as any)?.wrongAnswers || 0,
      unanswered: (result.sections as any)?.unanswered || 0,
      sections: {
        reasoning: (result.sections as any)?.reasoning || 0,
        quantitative: (result.sections as any)?.quantitative || 0,
        english: (result.sections as any)?.english || 0
      },
      questions: result.answers || [],
      timeSpent: result.timeSpent,
      negativeMarking: (result.sections as any)?.negativeMarking || true,
      negativeMarkValue: (result.sections as any)?.negativeMarkValue || 0.25,
      userId: result.userId
    }))

    return NextResponse.json({ attempts: userResults })
  } catch (error) {
    console.error("Error fetching recent results:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
