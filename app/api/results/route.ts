import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"

const prisma = new PrismaClient()

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
    console.error('Token validation error:', error instanceof Error ? error.message : 'Unknown error')
    throw new Error('Invalid token')
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = await validateToken(token)
    
    const body = await request.json()
    const {
      quizId,
      quizName,
      totalScore,
      rawScore,
      positiveMarks,
      negativeMarks,
      correctAnswers,
      wrongAnswers,
      unanswered,
      sections,
      questions,
      timeSpent,
      negativeMarking,
      negativeMarkValue
    } = body

    // Validate required fields
    if (!quizId || typeof totalScore !== 'number') {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 })
    }

    console.log('💾 Saving quiz result to database:', {
      userId: decoded.userId,
      quizId,
      totalScore
    })

    // Save to database
    const result = await prisma.quizResult.create({
      data: {
        quizId,
        userId: decoded.userId,
        userName: decoded.name || 'Unknown User',
        userEmail: decoded.email || 'unknown@email.com',
        totalScore,
        sections: {
          reasoning: sections?.reasoning || 0,
          quantitative: sections?.quantitative || 0,
          english: sections?.english || 0,
          rawScore,
          positiveMarks,
          negativeMarks,
          correctAnswers,
          wrongAnswers,
          unanswered,
          negativeMarking,
          negativeMarkValue
        },
        answers: questions || [],
        timeSpent: timeSpent || 0,
      },
    })

    console.log('✅ Quiz result saved successfully:', result.id)

    // Also save to localStorage for offline access (optional)
    const localStorageResult = {
      _id: result.id,
      date: result.date.toISOString(),
      quizName,
      quizId,
      totalScore,
      rawScore,
      positiveMarks,
      negativeMarks,
      correctAnswers,
      wrongAnswers,
      unanswered,
      sections,
      questions,
      timeSpent,
      negativeMarking,
      negativeMarkValue,
      userId: decoded.userId
    }

    return NextResponse.json({ 
      success: true, 
      result: localStorageResult,
      message: "Quiz result saved successfully" 
    })

  } catch (error) {
    console.error("❌ Error saving quiz result:", error)
    return NextResponse.json({ 
      message: "Failed to save quiz result",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = await validateToken(token)

    // Get user's quiz results from database
    const results = await prisma.quizResult.findMany({
      where: { userId: decoded.userId },
      include: {
        quiz: {
          select: {
            title: true,
            description: true
          }
        }
      },
      orderBy: { date: 'desc' }
    })

    // Transform database results to match frontend format
    const transformedResults = results.map(result => ({
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

    return NextResponse.json({ results: transformedResults })

  } catch (error) {
    console.error("Error fetching quiz results:", error)
    return NextResponse.json({ 
      message: "Failed to fetch quiz results",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
