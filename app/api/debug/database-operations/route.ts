import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ 
        message: "Authentication required for database operations test",
        errorType: "AUTH_ERROR"
      }, { status: 401 })
    }

    const { operations } = await request.json()
    const results: any = {
      environment: "vercel",
      timestamp: new Date().toISOString(),
      operations: {},
      environment_info: {}
    }

    // Test basic connection
    if (operations.includes('connect')) {
      try {
        console.log('Testing database connection...')
        await prisma.$connect()
        results.operations.connect = {
          status: 'success',
          message: 'Database connection established'
        }
        console.log('✅ Database connection successful')
      } catch (error) {
        results.operations.connect = {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          errorType: 'CONNECTION_ERROR'
        }
        console.error('❌ Database connection failed:', error)
      }
    }

    // Test basic query
    if (operations.includes('query')) {
      try {
        console.log('Testing basic query...')
        const subjectCount = await prisma.subject.count()
        const chapterCount = await prisma.chapter.count()
        const quizCount = await prisma.quiz.count()
        
        results.operations.query = {
          status: 'success',
          data: {
            subjects: subjectCount,
            chapters: chapterCount,
            quizzes: quizCount
          },
          message: 'Basic queries executed successfully'
        }
        console.log('✅ Basic queries successful')
      } catch (error) {
        results.operations.query = {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          errorType: 'QUERY_ERROR',
          errorCode: (error as any)?.code
        }
        console.error('❌ Basic query failed:', error)
      }
    }

    // Test transaction
    if (operations.includes('transaction')) {
      try {
        console.log('Testing transaction...')
        
        const result = await prisma.$transaction(async (tx) => {
          // Create a test subject
          const testSubject = await tx.subject.create({
            data: {
              name: `Test Subject ${Date.now()}`,
              description: 'Test subject for database diagnostics',
              icon: '🧪',
              color: '#FF0000'
            }
          })

          // Create a test chapter
          const testChapter = await tx.chapter.create({
            data: {
              name: `Test Chapter ${Date.now()}`,
              description: 'Test chapter for database diagnostics',
              subjectId: testSubject.id
            }
          })

          // Clean up - delete the test data
          await tx.chapter.delete({
            where: { id: testChapter.id }
          })

          await tx.subject.delete({
            where: { id: testSubject.id }
          })

          return {
            subjectId: testSubject.id,
            chapterId: testChapter.id,
            message: 'Transaction completed successfully'
          }
        })

        results.operations.transaction = {
          status: 'success',
          data: result,
          message: 'Transaction test completed successfully'
        }
        console.log('✅ Transaction test successful')
      } catch (error) {
        results.operations.transaction = {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          errorType: 'TRANSACTION_ERROR',
          errorCode: (error as any)?.code
        }
        console.error('❌ Transaction test failed:', error)
      }
    }

    // Test quiz creation specifically
    if (operations.includes('quiz_creation')) {
      try {
        console.log('Testing quiz creation...')
        
        // Get an existing chapter for the test
        const existingChapter = await prisma.chapter.findFirst({
          include: { subject: true }
        })

        if (!existingChapter) {
          results.operations.quiz_creation = {
            status: 'error',
            message: 'No chapters found in database for quiz creation test',
            errorType: 'DATA_MISSING'
          }
        } else {
          // Create a test quiz
          const testQuiz = await prisma.quiz.create({
            data: {
              title: `Database Test Quiz ${Date.now()}`,
              description: 'Test quiz for database diagnostics',
              timeLimit: 30,
              chapterId: existingChapter.id,
              sections: JSON.stringify(['Test Section']),
              questions: JSON.stringify([{
                id: `test-${Date.now()}`,
                question: 'Test question',
                options: ['A', 'B', 'C', 'D'],
                correctAnswer: 0,
                section: 'Test Section'
              }]),
              isActive: true,
              createdBy: 'diagnostic-test',
              negativeMarking: true,
              negativeMarkValue: 0.25
            }
          })

          // Clean up - delete the test quiz
          await prisma.quiz.delete({
            where: { id: testQuiz.id }
          })

          results.operations.quiz_creation = {
            status: 'success',
            data: {
              quizId: testQuiz.id,
              chapterId: existingChapter.id,
              subjectName: existingChapter.subject.name,
              chapterName: existingChapter.name
            },
            message: 'Quiz creation test completed successfully'
          }
          console.log('✅ Quiz creation test successful')
        }
      } catch (error) {
        results.operations.quiz_creation = {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          errorType: 'QUIZ_CREATION_ERROR',
          errorCode: (error as any)?.code,
          prismaError: (error as any)?.meta
        }
        console.error('❌ Quiz creation test failed:', error)
      }
    }

    // Test disconnect
    if (operations.includes('disconnect')) {
      try {
        console.log('Testing database disconnect...')
        await prisma.$disconnect()
        results.operations.disconnect = {
          status: 'success',
          message: 'Database disconnection successful'
        }
        console.log('✅ Database disconnect successful')
      } catch (error) {
        results.operations.disconnect = {
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
          errorType: 'DISCONNECT_ERROR'
        }
        console.error('❌ Database disconnect failed:', error)
      }
    }

    // Environment information
    results.environment_info = {
      node_version: process.version,
      platform: process.platform,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      env_vars: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: !!process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV
      }
    }

    return NextResponse.json(results)

  } catch (error) {
    console.error('Database operations test error:', error)
    
    return NextResponse.json({
      message: "Database operations test failed",
      error: error instanceof Error ? error.message : String(error),
      errorType: "OPERATIONS_TEST_ERROR",
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
