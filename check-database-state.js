const { PrismaClient } = require('./lib/generated/prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking database content...');
    console.log('=' .repeat(50));

    // Check users
    const users = await prisma.user.findMany();
    console.log(`📊 Users in database: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ${user.email} (${user.userType}, admin: ${user.isAdmin})`);
    });

    // Check quizzes
    const quizzes = await prisma.quiz.findMany();
    console.log(`\n📝 Quizzes in database: ${quizzes.length}`);
    quizzes.forEach(quiz => {
      console.log(`   - ${quiz.title} (${quiz.id})`);
    });

    // Check quiz results
    const results = await prisma.quizResult.findMany({
      include: {
        user: true,
        quiz: true
      }
    });
    console.log(`\n📈 Quiz results in database: ${results.length}`);
    results.forEach(result => {
      console.log(`   - User: ${result.user.email}, Quiz: ${result.quiz?.title || result.quizId}, Score: ${result.score}`);
    });

    if (users.length === 0) {
      console.log('\n⚠️  No users found! Creating test users...');
      
      // Create test student
      const testStudent = await prisma.user.create({
        data: {
          id: 'test-student-uuid',
          name: 'Test Student',
          email: 'test@example.com',
          password: 'password123',
          userType: 'student',
          isAdmin: false
        }
      });
      
      // Create test admin
      const testAdmin = await prisma.user.create({
        data: {
          id: 'test-admin-uuid',
          name: 'Test Admin',
          email: 'admin@example.com',
          password: 'admin123',
          userType: 'admin',
          isAdmin: true
        }
      });

      console.log('✅ Created test users:');
      console.log(`   - ${testStudent.email} (student)`);
      console.log(`   - ${testAdmin.email} (admin)`);
    }

    if (quizzes.length === 0) {
      console.log('\n⚠️  No quizzes found! Creating test quiz...');
      
      const testQuiz = await prisma.quiz.create({
        data: {
          id: 'test-quiz-1',
          title: 'Test Quiz',
          description: 'A test quiz for debugging',
          questions: [
            {
              id: 'q1',
              question: 'What is 2+2?',
              options: ['3', '4', '5', '6'],
              correctAnswer: 1
            },
            {
              id: 'q2',
              question: 'What is the capital of France?',
              options: ['London', 'Berlin', 'Paris', 'Madrid'],
              correctAnswer: 2
            }
          ],
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log('✅ Created test quiz:');
      console.log(`   - ${testQuiz.title} (${testQuiz.id})`);
    }

  } catch (error) {
    console.error('❌ Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase().catch(console.error);
