const { PrismaClient } = require('./lib/generated/prisma/client');

async function checkQuizResultStructure() {
  const prisma = new PrismaClient();
  try {
    const result = await prisma.quizResult.findFirst({
      include: {
        user: true,
        quiz: true
      }
    });
    
    if (result) {
      console.log('✅ Quiz Result Structure:');
      console.log('User info:', {
        id: result.user.id,
        name: result.user.name, 
        email: result.user.email
      });
      console.log('Quiz info:', result.quiz ? result.quiz.title : 'No quiz');
      console.log('Answers structure:', result.answers ? result.answers.slice(0, 2) : 'No answers');
      console.log('Sections:', result.sections);
      
      // Check all users
      const users = await prisma.user.findMany({
        where: { isAdmin: false },
        select: { id: true, name: true, email: true }
      });
      console.log('\n📋 Available Users:');
      users.forEach(user => {
        console.log(`   - ${user.name} (${user.email})`);
      });
      
    } else {
      console.log('❌ No quiz results found');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkQuizResultStructure().catch(console.error);
