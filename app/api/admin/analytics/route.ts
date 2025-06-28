import { PrismaClient } from "@/lib/generated/prisma"
import { parseJsonField } from "@/lib/database-utils"

export const dynamic = 'force-dynamic'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    console.log('📊 Admin analytics API called')
    
    // Get all quiz results first - simple query
    const allQuizResults = await prisma.quizResult.findMany({
      orderBy: {
        date: 'desc'
      }
    })
    
    console.log(`📊 Found ${allQuizResults.length} quiz results`)
    
    // Get all quizzes separately
    const allQuizzes = await prisma.quiz.findMany({
      select: { 
        id: true,
        title: true,
        questions: true,
        isActive: true,
        createdAt: true
      }
    })
    
    console.log(`📊 Found ${allQuizzes.length} quizzes`)
    
    // Calculate basic statistics
    const totalUsers = new Set(allQuizResults.map(r => r.userEmail)).size
    const totalQuizzes = allQuizzes.length
    const activeQuizzes = allQuizzes.filter(q => q.isActive).length
    const totalAttempts = allQuizResults.length

    // Calculate average score and time
    const averageScore = allQuizResults.length > 0 
      ? Math.round(allQuizResults.reduce((sum, r) => sum + r.totalScore, 0) / allQuizResults.length)
      : 0
      
    const averageTime = allQuizResults.length > 0
      ? Math.round(allQuizResults.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / allQuizResults.length)
      : 0
      
    // Calculate total questions across all quizzes
    const totalQuestions = allQuizzes.reduce((total, quiz) => {
      const questions = parseJsonField(quiz.questions)
      return total + questions.length
    }, 0)

    // Process quiz results to add missing fields that frontend expects
    const processedResults = allQuizResults.map(result => {
      const sections = parseJsonField(result.sections)
      const answers = parseJsonField(result.answers)
      
      // Calculate correct/wrong answers from the answers data
      let correctAnswers = 0
      let wrongAnswers = 0
      let unanswered = 0
      
      if (Array.isArray(answers)) {
        answers.forEach(answer => {
          if (answer.selectedAnswer === null || answer.selectedAnswer === undefined) {
            unanswered++
          } else if (answer.isCorrect) {
            correctAnswers++
          } else {
            wrongAnswers++
          }
        })
      }
      
      // Get quiz title from quizzes array
      const quiz = allQuizzes.find(q => q.id === result.quizId)
      
      return {
        ...result,
        correctAnswers,
        wrongAnswers,
        unanswered,
        // Include both _id and id for compatibility
        _id: result.id,
        sections: sections || {
          reasoning: 0,
          quantitative: 0,
          english: 0
        },
        // Add quiz data manually since relations aren't working
        quiz: quiz ? {
          id: quiz.id,
          title: quiz.title
        } : null
      }
    })
    
    // Recent activity (latest 20 results)
    const recentActivity = processedResults.slice(0, 20).map(result => ({
      id: result.id,
      userEmail: result.userEmail,
      userName: result.userName || 'Anonymous',
      quizTitle: result.quiz?.title || 'Unknown Quiz',
      score: result.totalScore,
      timeSpent: result.timeSpent,
      date: result.date
    }))

    const analytics = {
      success: true,
      timestamp: new Date().toISOString(),
      totalUsers,
      totalQuizzes,
      activeQuizzes,
      totalAttempts,
      totalQuestions,
      averageScore,
      averageTime,
      recentActivity,
      results: processedResults, // Full results with all fields for compatibility
      quizzes: allQuizzes.map(q => ({
        id: q.id,
        title: q.title,
        questions: parseJsonField(q.questions),
        isActive: q.isActive,
        createdAt: q.createdAt
      }))
    }

    console.log(`📈 Analytics calculated:`, {
      totalUsers: analytics.totalUsers,
      totalQuizzes: analytics.totalQuizzes,
      totalAttempts: analytics.totalAttempts,
      resultsWithQuizData: analytics.results.filter(r => r.quiz?.title).length,
      timestamp: analytics.timestamp
    })
    
    return Response.json(analytics)
  } catch (error) {
    console.error("❌ Admin analytics API error:", error)
    return Response.json({ 
      success: false,
      message: "Internal server error", 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
