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

async function fixProductionQuiz() {
  console.log('🔧 Fixing "Ratio and Proportion L1" Quiz in Production...\n');

  try {
    // 1. Find the orphaned quiz
    const orphanedQuiz = await prisma.quiz.findFirst({
      where: {
        title: 'Ratio and Proportion L1',
        chapterId: null
      }
    });

    if (!orphanedQuiz) {
      console.log('❌ Quiz "Ratio and Proportion L1" not found or already has a chapter');
      return;
    }

    console.log('📝 Found orphaned quiz:', orphanedQuiz.title);
    console.log('   ID:', orphanedQuiz.id);
    console.log('   Current chapterId:', orphanedQuiz.chapterId);

    // 2. Find the "Ratio and Proportion" chapter
    const ratioChapter = await prisma.chapter.findFirst({
      where: {
        name: 'Ratio and Proportion'
      },
      include: {
        subject: true
      }
    });

    if (!ratioChapter) {
      console.log('❌ Chapter "Ratio and Proportion" not found');
      
      // List all available chapters
      const allChapters = await prisma.chapter.findMany({
        include: {
          subject: true
        }
      });
      console.log('\n📚 Available chapters:');
      allChapters.forEach(chapter => {
        console.log(`   - ${chapter.name} (${chapter.subject.name}) - ID: ${chapter.id}`);
      });
      return;
    }

    console.log('✅ Found target chapter:', ratioChapter.name);
    console.log('   Chapter ID:', ratioChapter.id);
    console.log('   Subject:', ratioChapter.subject.name);

    // 3. Update the quiz to associate it with the chapter
    const updatedQuiz = await prisma.quiz.update({
      where: { id: orphanedQuiz.id },
      data: {
        chapterId: ratioChapter.id
      }
    });

    console.log('🎯 Successfully fixed quiz!');
    console.log('   Quiz:', updatedQuiz.title);
    console.log('   New chapterId:', updatedQuiz.chapterId);
    console.log('   Active:', updatedQuiz.isActive);

    // 4. Verify the fix
    console.log('\n✅ Verification - Current quiz status:');
    const verifyQuiz = await prisma.quiz.findUnique({
      where: { id: updatedQuiz.id },
      include: {
        chapter: {
          include: {
            subject: true
          }
        }
      }
    });

    if (verifyQuiz) {
      console.log(`   📝 ${verifyQuiz.title}`);
      console.log(`   📑 Chapter: ${verifyQuiz.chapter?.name || 'NULL'}`);
      console.log(`   📖 Subject: ${verifyQuiz.chapter?.subject?.name || 'NULL'}`);
      console.log(`   ✅ Active: ${verifyQuiz.isActive}`);
    }

    // 5. Show final chapter quiz counts
    console.log('\n📊 Final Chapter Quiz Status:');
    const finalChapter = await prisma.chapter.findUnique({
      where: { id: ratioChapter.id },
      include: {
        _count: {
          select: { quizzes: true }
        },
        quizzes: {
          where: { isActive: true },
          select: { id: true, title: true, isActive: true }
        },
        subject: true
      }
    });

    if (finalChapter) {
      console.log(`   📑 ${finalChapter.name} (${finalChapter.subject.name}):`);
      console.log(`      Total Quiz Count: ${finalChapter._count.quizzes}`);
      console.log(`      Active Quiz Count: ${finalChapter.quizzes.length}`);
      finalChapter.quizzes.forEach(quiz => {
        console.log(`      🎯 ${quiz.title} (Active: ${quiz.isActive})`);
      });
    }

    console.log('\n🎉 Fix completed! Both quizzes should now be visible in the student portal.');

  } catch (error) {
    console.error('❌ Error fixing quiz:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixProductionQuiz().catch(console.error);
