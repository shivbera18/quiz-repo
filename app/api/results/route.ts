import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering to ensure fresh data
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
    const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days in ms
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
        timeSpent: timeSpent || 0,
        sections: JSON.stringify({
          reasoning: sections?.reasoning || 0,
          quantitative: sections?.quantitative || 0,
          english: sections?.english || 0,
        }),
        answers: JSON.stringify(questions || []),
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
    console.log('📊 Fetching user quiz results...')
    
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log('❌ No authorization header')
      return NextResponse.json({ message: "Unauthorized", results: [] }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Validate token and get user info
    let decoded
    try {
      decoded = await validateToken(token)
    } catch (tokenError) {
      console.log('❌ Token validation failed:', tokenError instanceof Error ? tokenError.message : 'Unknown error')
      return NextResponse.json({ message: "Invalid or expired token", results: [] }, { status: 401 })
    }
    
    console.log('✅ Token validated for user:', decoded.userId)

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

    console.log(`📈 Found ${results.length} quiz results for user ${decoded.userId}`)

    // Transform database results to match frontend format
    const transformedResults = results.map(result => {
      // Parse JSON strings safely
      let sections = { reasoning: 0, quantitative: 0, english: 0 }
      let answers: any[] = []
      
      try {
        if (result.sections) {
          const parsedSections = JSON.parse(result.sections)
          sections = { ...sections, ...parsedSections }
        }
      } catch (e) {
        console.warn('Failed to parse sections JSON:', e)
      }
      
      try {
        if (result.answers) {
          answers = JSON.parse(result.answers)
        }
      } catch (e) {
        console.warn('Failed to parse answers JSON:', e)
      }

      return {
        _id: result.id,
        date: result.date.toISOString(),
        quizName: result.quiz?.title || 'Unknown Quiz',
        quizId: result.quizId,
        totalScore: result.totalScore,
        rawScore: result.totalScore, // Use totalScore as rawScore since we don't have separate field
        positiveMarks: sections.reasoning + sections.quantitative + sections.english,
        negativeMarks: 0, // Calculate from answers if needed
        correctAnswers: answers.filter(a => a.isCorrect === true).length,
        wrongAnswers: answers.filter(a => a.isCorrect === false && !a.isUnanswered && a.userAnswer !== null && a.userAnswer !== undefined).length,
        unanswered: answers.filter(a => a.isUnanswered === true || a.userAnswer === null || a.userAnswer === undefined).length,
        sections,
        questions: [], // Not stored in results
        answers,
        timeSpent: result.timeSpent,
        negativeMarking: true, // Default value
        negativeMarkValue: 0.25, // Default value
        userId: result.userId
      }
    })

    console.log('✅ Returning transformed results:', transformedResults.length)
    
    // Always return results array, even if empty
    const response = NextResponse.json({ 
      results: transformedResults,
      success: true,
      timestamp: new Date().toISOString(),
      count: transformedResults.length
    })

    // Add no-cache headers to ensure fresh data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error) {
    console.error("❌ Error fetching quiz results:", error)
    
    // Return empty results array instead of error for better UX
    const errorResponse = NextResponse.json({ 
      results: [],
      success: false,
      message: "Failed to fetch quiz results",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      count: 0
    }, { status: 500 })

    // Add no-cache headers even for error responses
    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    errorResponse.headers.set('Pragma', 'no-cache')
    errorResponse.headers.set('Expires', '0')
    
    return errorResponse
  }
}
