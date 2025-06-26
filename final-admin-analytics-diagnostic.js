const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function runComprehensiveDiagnostic() {
  console.log('🔍 Running Final Admin Analytics Diagnostic...\n');

  try {
    // 1. Check if database connection is working
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // 2. Check total quiz results count
    console.log('2. Checking total quiz results...');
    const totalResults = await prisma.quizResult.count();
    console.log(`📊 Total quiz results in database: ${totalResults}\n`);

    if (totalResults === 0) {
      console.log('❌ No quiz results found in database!');
      console.log('This explains why admin analytics is empty.\n');
      
      // Check if users exist
      const userCount = await prisma.user.count();
      console.log(`👥 Total users in database: ${userCount}`);
      
      // Check if quizzes exist
      const quizCount = await prisma.quiz.count();
      console.log(`📝 Total quizzes in database: ${quizCount}\n`);
      
      return;
    }

    // 3. Sample quiz results data
    console.log('3. Sampling quiz results data...');
    const sampleResults = await prisma.quizResult.findMany({
      take: 5,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        quiz: {
          select: {
            id: true,
            title: true,
            type: true
          }
        }
      }
    });

    console.log('📋 Sample quiz results:');
    sampleResults.forEach((result, index) => {
      console.log(`${index + 1}. Result ID: ${result.id}`);
      console.log(`   User: ${result.user?.name || 'Unknown'} (${result.user?.email || 'No email'})`);
      console.log(`   Quiz: ${result.quiz?.title || 'Unknown Quiz'} (${result.quiz?.type || 'Unknown Type'})`);
      console.log(`   Score: ${result.score}/${result.totalQuestions}`);
      console.log(`   Completed: ${result.completedAt}`);
      console.log('');
    });

    // 4. Check specific data that admin analytics queries
    console.log('4. Checking admin analytics query data...');
    
    // This is the exact query from the admin analytics API
    const analyticsData = await prisma.quizResult.findMany({
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
            type: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    console.log(`📈 Admin analytics query returned: ${analyticsData.length} results`);

    if (analyticsData.length > 0) {
      console.log('✅ Admin analytics query is working and returning data!');
      console.log('\n🔍 Checking if there might be a frontend issue...');
      
      // Sample the data structure that would be sent to frontend
      const sample = analyticsData[0];
      console.log('📋 Sample data structure:');
      console.log(JSON.stringify({
        id: sample.id,
        userId: sample.userId,
        userName: sample.user?.name,
        userEmail: sample.user?.email,
        quizTitle: sample.quiz?.title,
        quizType: sample.quiz?.type,
        score: sample.score,
        totalQuestions: sample.totalQuestions,
        completedAt: sample.completedAt
      }, null, 2));
    } else {
      console.log('❌ Admin analytics query returned no results despite database having data!');
      console.log('This indicates a problem with the query or data relationships.');
    }

    // 5. Check user performance data
    console.log('\n5. Checking user performance data...');
    const users = await prisma.user.findMany({
      take: 3,
      include: {
        quizResults: {
          include: {
            quiz: true,
          },
        },
      },
    });

    console.log(`👥 User performance data for ${users.length} users:`);
    users.forEach(user => {
      console.log(`- ${user.name || 'Unknown'} (${user.email}): ${user.quizResults.length} quiz results`);
    });

    // 6. Test the exact API endpoint logic
    console.log('\n6. Testing API endpoint logic...');
    try {
      // Simulate what the API does
      const results = await prisma.quizResult.findMany({
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
              type: true,
            },
          },
        },
        orderBy: {
          completedAt: 'desc',
        },
      });

      const transformedData = results.map(result => ({
        id: result.id,
        userId: result.userId,
        userName: result.user?.name || 'Unknown User',
        userEmail: result.user?.email || 'No Email',
        quizId: result.quizId,
        quizTitle: result.quiz?.title || 'Unknown Quiz',
        quizType: result.quiz?.type || 'Unknown Type',
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: result.totalQuestions > 0 ? Math.round((result.score / result.totalQuestions) * 100) : 0,
        completedAt: result.completedAt,
        duration: result.duration || 0,
      }));

      console.log(`🎯 API would return ${transformedData.length} transformed results`);
      
      if (transformedData.length > 0) {
        console.log('✅ API logic is working correctly!');
        console.log('\n🎯 CONCLUSION: The backend is working fine.');
        console.log('The issue might be:');
        console.log('1. Frontend caching issues (despite cache-busting headers)');
        console.log('2. Frontend JavaScript errors preventing data display');
        console.log('3. CSS/styling issues hiding the data');
        console.log('4. API endpoint not being called correctly from frontend');
      }

    } catch (apiError) {
      console.error('❌ API logic test failed:', apiError);
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnostic
runComprehensiveDiagnostic().catch(console.error);
