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
    
    // Allow tokens to stay valid for 30 days to avoid frequent logouts on deployments
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

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching student analytics...')
    
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log('❌ No authorization header')
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Validate token and get user info
    let decoded
    try {
      decoded = await validateToken(token)
    } catch (tokenError) {
      console.log('❌ Token validation failed:', tokenError instanceof Error ? tokenError.message : 'Unknown error')
      return NextResponse.json({ message: "Invalid or expired token" }, { status: 401 })
    }
    
    console.log('✅ Token validated for user:', decoded.userId)

    // Get user's quiz results from database
    const results = await prisma.quizResult.findMany({
      where: { userId: decoded.userId },
      include: {
        quiz: {
          select: {
            title: true,
            description: true,
            chapterId: true,
            chapter: {
              select: {
                name: true,
                subject: {
                  select: {
                    name: true,
                    icon: true,
                    color: true
                  }
                }
              }
            }
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
        id: result.id,
        date: result.date.toISOString(),
        quizName: result.quiz?.title || 'Unknown Quiz',
        quizId: result.quizId,
        totalScore: result.totalScore,
        rawScore: result.totalScore,
        positiveMarks: sections.reasoning + sections.quantitative + sections.english,
        negativeMarks: Math.max(0, (sections.reasoning + sections.quantitative + sections.english) - result.totalScore),
        correctAnswers: answers.filter(a => a.isCorrect === true).length,
        wrongAnswers: answers.filter(a => a.isCorrect === false && !a.isUnanswered && a.userAnswer !== null && a.userAnswer !== undefined).length,
        unanswered: answers.filter(a => a.isUnanswered === true || a.userAnswer === null || a.userAnswer === undefined).length,
        sections,
        questions: [], // Not stored in results
        answers,
        timeSpent: result.timeSpent,
        negativeMarking: true,
        negativeMarkValue: 0.25,
        userId: result.userId,
        userName: result.userName,
        userEmail: result.userEmail,
        user: {
          id: result.userId,
          name: result.userName,
          email: result.userEmail
        },
        quiz: result.quiz,
        // Enhanced analytics fields
        subject: result.quiz?.chapter?.subject?.name || 'Unknown Subject',
        chapter: result.quiz?.chapter?.name || 'Unknown Chapter',
        subjectIcon: result.quiz?.chapter?.subject?.icon || '📚',
        subjectColor: result.quiz?.chapter?.subject?.color || '#3B82F6'
      }
    })

    // Calculate analytics stats
    const totalAttempts = transformedResults.length
    const averageScore = totalAttempts > 0 ? 
      Math.round(transformedResults.reduce((sum, r) => sum + r.totalScore, 0) / totalAttempts) : 0
    
    const bestScore = totalAttempts > 0 ? Math.max(...transformedResults.map(r => r.totalScore)) : 0
    const recentAttempts = transformedResults.slice(0, 10)
    
    // Subject-wise performance
    const subjectStats: { [key: string]: any } = {}
    transformedResults.forEach(result => {
      const subject = result.subject
      if (!subjectStats[subject]) {
        subjectStats[subject] = {
          subject,
          attempts: 0,
          totalScore: 0,
          bestScore: 0,
          icon: result.subjectIcon,
          color: result.subjectColor
        }
      }
      subjectStats[subject].attempts++
      subjectStats[subject].totalScore += result.totalScore
      subjectStats[subject].bestScore = Math.max(subjectStats[subject].bestScore, result.totalScore)
    })
    
    // Convert to array and add average scores
    const subjectStatsArray = Object.values(subjectStats).map((stat: any) => ({
      ...stat,
      averageScore: Math.round(stat.totalScore / stat.attempts)
    }))

    // Chapter-wise performance  
    const chapterStats: { [key: string]: any } = {}
    transformedResults.forEach(result => {
      const chapterKey = `${result.subject} - ${result.chapter}`
      if (!chapterStats[chapterKey]) {
        chapterStats[chapterKey] = {
          subject: result.subject,
          chapter: result.chapter,
          attempts: 0,
          totalScore: 0,
          bestScore: 0
        }
      }
      chapterStats[chapterKey].attempts++
      chapterStats[chapterKey].totalScore += result.totalScore
      chapterStats[chapterKey].bestScore = Math.max(chapterStats[chapterKey].bestScore, result.totalScore)
    })
    
    const chapterStatsArray = Object.values(chapterStats).map((stat: any) => ({
      ...stat,
      averageScore: Math.round(stat.totalScore / stat.attempts)
    }))

    // Performance trends (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const recentResults = transformedResults.filter(r => 
      new Date(r.date) >= thirtyDaysAgo
    ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    console.log('✅ Student analytics calculated successfully')
    
    const response = NextResponse.json({ 
      success: true,
      results: transformedResults,
      analytics: {
        totalAttempts,
        averageScore,
        bestScore,
        recentAttempts,
        subjectStats: subjectStatsArray,
        chapterStats: chapterStatsArray,
        performanceTrend: recentResults.map(r => ({
          date: r.date,
          score: r.totalScore,
          quizName: r.quizName
        }))
      },
      timestamp: new Date().toISOString(),
      userId: decoded.userId
    })

    // Add no-cache headers to ensure fresh data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
    
    return response

  } catch (error) {
    console.error("❌ Error fetching student analytics:", error)
    
    const errorResponse = NextResponse.json({ 
      success: false,
      results: [],
      analytics: null,
      message: "Failed to fetch analytics",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 })

    // Add no-cache headers even for error responses
    errorResponse.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
    errorResponse.headers.set('Pragma', 'no-cache')
    errorResponse.headers.set('Expires', '0')
    
    return errorResponse
  }
}
