// Simple API test for Vercel deployment
// This endpoint helps test basic functionality in Vercel

export async function GET(request: Request) {
  try {
    console.log('🧪 Vercel API Test Started');
    
    const testResults: {
      timestamp: string
      environment: string | undefined
      vercel: { region: string; url: string }
      database: { hasUrl: boolean; urlLength: number; urlStart: string }
      prismaImport?: { importSuccess: boolean; error: string | null }
      dbConnection?: { success: boolean }
      dbCounts?: { quizResults: number; users: number; quizzes: number }
      sampleQuery?: { found: boolean; data: unknown }
      error?: string
    } = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      vercel: {
        region: process.env.VERCEL_REGION || 'unknown',
        url: process.env.VERCEL_URL || 'unknown'
      },
      database: {
        hasUrl: !!process.env.DATABASE_URL,
        urlLength: process.env.DATABASE_URL?.length || 0,
        urlStart: process.env.DATABASE_URL?.substring(0, 20) + '...' || 'none'
      }
    };

    // Test 1: Basic Prisma import
    const prismaTest: { importSuccess: boolean; error: string | null } = { importSuccess: false, error: null };
    try {
      const { PrismaClient } = await import("@/lib/generated/prisma");
      prismaTest.importSuccess = true;
      testResults.prismaImport = prismaTest;

      // Test 2: Database connection
      const prisma = new PrismaClient();
      await prisma.$connect();
      testResults.dbConnection = { success: true };

      // Test 3: Simple count query
      const quizResultCount = await prisma.quizResult.count();
      const userCount = await prisma.user.count();
      const quizCount = await prisma.quiz.count();

      testResults.dbCounts = {
        quizResults: quizResultCount,
        users: userCount,
        quizzes: quizCount
      };

      // Test 4: Sample query (like analytics)
      const sampleResult = await prisma.quizResult.findFirst({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          quiz: {
            select: {
              id: true,
              title: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      });

      testResults.sampleQuery = {
        found: !!sampleResult,
        data: sampleResult ? {
          id: sampleResult.id,
          userName: sampleResult.userName,
          quizTitle: sampleResult.quiz?.title,
          score: sampleResult.totalScore,
          date: sampleResult.date
        } : null
      };

      await prisma.$disconnect();

    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      prismaTest.error = message;
      testResults.prismaImport = prismaTest;
      testResults.error = message;
    }

    console.log('✅ Vercel test completed:', testResults);

    return Response.json({
      status: 'Vercel API Test',
      success: true,
      ...testResults
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ Vercel test failed:', error);
    return Response.json({
      status: 'Vercel API Test Failed',
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}
