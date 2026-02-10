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
    
    // Allow tokens to stay valid for 30 days to prevent unexpected expiry loops
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
    throw new Error('Invalid token')
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header")
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    console.log("Validating token for results API...")
    const decoded = await validateToken(token)
    console.log("Token validated successfully for user:", decoded.userId)

    // Await params in Next.js 15
    const { id } = await params

    // Find result in database
    const dbResult = await prisma.quizResult.findFirst({
      where: { 
        id: id,
        userId: decoded.userId 
      },
      include: {
        quiz: {
          select: {
            title: true,
            description: true,
            questions: true
          }
        }
      }
    })

    if (!dbResult) {
      return NextResponse.json({ message: "Result not found" }, { status: 404 })
    }

    // Parse JSON strings from database
    let parsedAnswers = [];
    try {
      parsedAnswers = typeof dbResult.answers === 'string' 
        ? JSON.parse(dbResult.answers) 
        : dbResult.answers || [];
    } catch (e) {
      console.error("Error parsing answers:", e);
      parsedAnswers = [];
    }

    // Parse quiz questions to get explanations
    let quizQuestions = [];
    try {
      quizQuestions = typeof dbResult.quiz?.questions === 'string'
        ? JSON.parse(dbResult.quiz.questions)
        : dbResult.quiz?.questions || [];
    } catch (e) {
      console.error("Error parsing quiz questions:", e);
      quizQuestions = [];
    }

    // Create a map of questionId to explanation for quick lookup
    const questionExplanations = new Map();
    quizQuestions.forEach((q: any) => {
      if (q.id && q.explanation) {
        questionExplanations.set(q.id, q.explanation);
      }
    });

    // Merge explanations into parsedAnswers
    parsedAnswers = parsedAnswers.map((answer: any) => {
      if (answer.questionId && !answer.explanation) {
        const explanation = questionExplanations.get(answer.questionId);
        if (explanation) {
          return { ...answer, explanation };
        }
      }
      return answer;
    });

    let parsedSections: any = {};
    try {
      parsedSections = typeof dbResult.sections === 'string' 
        ? JSON.parse(dbResult.sections) 
        : dbResult.sections || {};
    } catch (e) {
      console.error("Error parsing sections:", e);
      parsedSections = {};
    }

    // Transform database result to match frontend format
    const result = {
      _id: dbResult.id,
      date: dbResult.date.toISOString(),
      quizName: dbResult.quiz?.title || 'Unknown Quiz',
      quizId: dbResult.quizId,
      totalScore: dbResult.totalScore,
      rawScore: parsedSections?.rawScore || dbResult.totalScore,
      positiveMarks: parsedSections?.positiveMarks || 0,
      negativeMarks: parsedSections?.negativeMarks || 0,
      correctAnswers: parsedSections?.correctAnswers || 0,
      wrongAnswers: parsedSections?.wrongAnswers || 0,
      unanswered: parsedSections?.unanswered || 0,
      sections: {
        reasoning: parsedSections?.reasoning || 0,
        quantitative: parsedSections?.quantitative || 0,
        english: parsedSections?.english || 0
      },
      questions: parsedAnswers,
      timeSpent: dbResult.timeSpent,
      negativeMarking: parsedSections?.negativeMarking || true,
      negativeMarkValue: parsedSections?.negativeMarkValue || 0.25,
      userId: dbResult.userId
    }

    return NextResponse.json({ result })

  } catch (error) {
    console.error("Error fetching quiz result:", error)
    
    // Check if it's a token validation error
    if (error instanceof Error && error.message === 'Invalid token') {
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 })
    }
    
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
