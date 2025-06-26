import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"

const prisma = new PrismaClient()

// Force this route to be dynamic (not statically rendered)
export const dynamic = 'force-dynamic'

// Helper function to validate simple token and extract user info
const validateToken = async (token: string) => {
  try {
    // Simple token format: userId-timestamp-random
    // Since userId is a UUID with dashes, we need to handle this carefully
    const lastDashIndex = token.lastIndexOf('-')
    const secondLastDashIndex = token.lastIndexOf('-', lastDashIndex - 1)
    
    if (lastDashIndex === -1 || secondLastDashIndex === -1) {
      throw new Error('Invalid token format')
    }
    
    const userId = token.substring(0, secondLastDashIndex)
    const timestamp = parseInt(token.substring(secondLastDashIndex + 1, lastDashIndex))
    
    if (isNaN(timestamp)) {
      throw new Error('Invalid timestamp in token')
    }
    
    // Check if token is not too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours in ms
    if (Date.now() - timestamp > maxAge) {
      throw new Error('Token expired')
    }
    
    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    if (!user) {
      throw new Error('User not found')
    }
    
    return {
      userId: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin
    }
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = await validateToken(token)

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
