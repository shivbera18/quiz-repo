const { PrismaClient } = require('./lib/generated/prisma');

// Use production database URL
const DATABASE_URL = "postgresql://quizdb_owner:npg_5ITBoeNYp1gR@ep-red-frost-a82wnsl6-pooler.eastus2.azure.neon.tech/quizdb?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL
    }
  }
});

async function fixOrphanedQuizzes() {
  try {
    console.log('🔧 Fixing orphaned quizzes in production database...');
    
    // Find the Ratio and Proportion chapter
    const chapter = await prisma.chapter.findFirst({
      where: {
        name: 'Ratio and Proportion'
      },
      include: {
        subject: true
      }
    });
    
    if (!chapter) {
      console.error('❌ Could not find "Ratio and Proportion" chapter');
      return;
    }
    
    console.log(`✅ Found chapter: "${chapter.name}" (ID: ${chapter.id}) in subject "${chapter.subject.name}"`);
    
    // Find orphaned quizzes (quizzes with chapterId = null)
    const orphanedQuizzes = await prisma.quiz.findMany({
      where: {
        chapterId: null,
        title: {
          contains: 'Ratio'
        }
      }
    });
    
    console.log(`📋 Found ${orphanedQuizzes.length} orphaned quizzes containing "Ratio":`);
    orphanedQuizzes.forEach((quiz, index) => {
      console.log(`   ${index + 1}. "${quiz.title}" (ID: ${quiz.id})`);
    });
    
    if (orphanedQuizzes.length === 0) {
      console.log('✅ No orphaned quizzes found!');
      return;
    }
    
    // Fix each orphaned quiz
    for (const quiz of orphanedQuizzes) {
      console.log(`🔧 Fixing quiz "${quiz.title}"...`);
      
      const updatedQuiz = await prisma.quiz.update({
        where: { id: quiz.id },
        data: { chapterId: chapter.id }
      });
      
      console.log(`✅ Fixed quiz "${updatedQuiz.title}" - now associated with chapter "${chapter.name}"`);
    }
    
    console.log('\n🎉 All orphaned quizzes have been fixed!');
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const allQuizzes = await prisma.quiz.findMany({
      where: {
        title: {
          contains: 'Ratio'
        }
      },
      include: {
        chapter: {
          include: {
            subject: true
          }
        }
      }
    });
    
    console.log('📋 All "Ratio" quizzes after fix:');
    allQuizzes.forEach((quiz, index) => {
      console.log(`   ${index + 1}. "${quiz.title}"`);
      console.log(`      Chapter: ${quiz.chapter ? quiz.chapter.name : 'NULL'}`);
      console.log(`      Subject: ${quiz.chapter?.subject ? quiz.chapter.subject.name : 'NULL'}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error fixing orphaned quizzes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrphanedQuizzes();
