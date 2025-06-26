// Production Environment Checker
// Add this to your production deployment to check what's happening

export async function GET(request: Request) {
  try {
    console.log('🔍 Production Environment Check Started');
    
    // Check 1: Environment Variables
    const envCheck = {
      DATABASE_URL: !!process.env.DATABASE_URL,
      DATABASE_URL_length: process.env.DATABASE_URL?.length || 0,
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    };
    
    console.log('📋 Environment Variables:', envCheck);

    // Check 2: Database Connection
    let dbCheck = { connected: false, error: null };
    try {
      const { PrismaClient } = await import("@/lib/generated/prisma");
      const prisma = new PrismaClient();
      
      await prisma.$connect();
      dbCheck.connected = true;
      
      // Check 3: Data Existence
      const quizResultCount = await prisma.quizResult.count();
      const quizCount = await prisma.quiz.count();
      const userCount = await prisma.user.count();
      
      dbCheck.data = {
        quizResults: quizResultCount,
        quizzes: quizCount,
        users: userCount
      };
      
      // Check 4: Sample Query (same as analytics)
      const sampleResults = await prisma.quizResult.findMany({
        take: 3,
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
      
      dbCheck.sampleQuery = {
        success: true,
        resultCount: sampleResults.length,
        sampleData: sampleResults.map(r => ({
          id: r.id,
          userId: r.userId,
          userName: r.userName,
          quizTitle: r.quiz?.title,
          score: r.totalScore,
          date: r.date
        }))
      };
      
      await prisma.$disconnect();
      
    } catch (error) {
      dbCheck.error = error.message;
      console.error('❌ Database connection failed:', error);
    }

    // Check 5: Request Information
    const requestInfo = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      timestamp: new Date().toISOString()
    };

    const response = {
      status: 'Production Environment Check',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: dbCheck,
      request: requestInfo,
      recommendations: []
    };

    // Add recommendations based on checks
    if (!dbCheck.connected) {
      response.recommendations.push("❌ Database connection failed - check DATABASE_URL and network connectivity");
    }
    
    if (dbCheck.connected && dbCheck.data?.quizResults === 0) {
      response.recommendations.push("⚠️ No quiz results found - database may be empty or using wrong database");
    }
    
    if (dbCheck.connected && dbCheck.data?.quizResults > 0 && dbCheck.sampleQuery?.resultCount === 0) {
      response.recommendations.push("❌ Sample query returned no results - check Prisma schema or query logic");
    }
    
    if (!envCheck.DATABASE_URL) {
      response.recommendations.push("❌ DATABASE_URL environment variable not set");
    }

    console.log('✅ Production check completed:', response);

    return Response.json(response, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ Production check failed:', error);
    return Response.json({
      status: 'Production Environment Check Failed',
      error: error.message,
      stack: error.stack
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
