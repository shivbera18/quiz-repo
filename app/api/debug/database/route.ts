export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test database connection
    const { PrismaClient } = require('@prisma/client')
    const prisma = new PrismaClient()
    
    // Test connection
    await prisma.$connect()
    
    // Get basic counts
    const [quizResults, users, quizzes] = await Promise.all([
      prisma.quizResult.count(),
      prisma.user.count(),
      prisma.quiz.count()
    ])
    
    // Try to get one quiz to test the actual query
    const sampleQuiz = await prisma.quiz.findFirst()
    
    await prisma.$disconnect()
    
    return Response.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel: {
        region: process.env.VERCEL_REGION || 'unknown',
        url: process.env.VERCEL_URL || 'unknown'
      },
      database: {
        hasUrl: !!process.env.DATABASE_URL,
        urlLength: process.env.DATABASE_URL?.length || 0,
        urlStart: process.env.DATABASE_URL?.substring(0, 50) + '...' || 'none',
        urlEnd: '...' + process.env.DATABASE_URL?.substring(process.env.DATABASE_URL.length - 30) || 'none'
      },
      dbConnection: {
        success: true,
        message: 'Database connection successful'
      },
      dbCounts: {
        quizResults,
        users,
        quizzes
      },
      sampleQuery: {
        found: !!sampleQuiz,
        data: sampleQuiz ? { id: sampleQuiz.id, title: sampleQuiz.title } : null
      }
    })
    
  } catch (error) {
    return Response.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      error: {
        message: error.message,
        name: error.name,
        code: error.code
      },
      database: {
        hasUrl: !!process.env.DATABASE_URL,
        urlLength: process.env.DATABASE_URL?.length || 0,
        urlStart: process.env.DATABASE_URL?.substring(0, 50) + '...' || 'none',
        urlEnd: '...' + process.env.DATABASE_URL?.substring(process.env.DATABASE_URL.length - 30) || 'none'
      },
      dbConnection: {
        success: false,
        message: 'Database connection failed'
      }
    }, { status: 500 })
  }
}
