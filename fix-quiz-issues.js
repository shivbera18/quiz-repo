const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function fixQuizIssues() {
  console.log('🔧 Fixing Quiz Issues...\n');

  try {
    // 1. Find the problematic quiz
    const problematicQuiz = await prisma.quiz.findFirst({
      where: {
        title: 'Ratio and Proportion Basic',
        chapterId: null
      }
    });

    if (problematicQuiz) {
      console.log('❌ Found problematic quiz:', problematicQuiz.title);
      console.log('   ID:', problematicQuiz.id);
      console.log('   Active:', problematicQuiz.isActive);
      console.log('   ChapterId:', problematicQuiz.chapterId);

      // Find the correct chapter for "Ratio and Proportion"
      const ratioChapter = await prisma.chapter.findFirst({
        where: {
          name: {
            contains: 'Ratio',
            mode: 'insensitive'
          }
        },
        include: {
          subject: true
        }
      });

      if (ratioChapter) {
        console.log('✅ Found matching chapter:', ratioChapter.name);
        console.log('   Chapter ID:', ratioChapter.id);
        console.log('   Subject:', ratioChapter.subject.name);

        // Fix the quiz
        const updatedQuiz = await prisma.quiz.update({
          where: { id: problematicQuiz.id },
          data: {
            chapterId: ratioChapter.id,
            isActive: true
          }
        });

        console.log('🎯 Fixed quiz successfully!');
        console.log('   New ChapterId:', updatedQuiz.chapterId);
        console.log('   New Active status:', updatedQuiz.isActive);
      } else {
        console.log('❌ Could not find matching chapter for "Ratio and Proportion"');
        
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
      }
    } else {
      console.log('✅ No problematic quiz found');
    }

    // 2. Verify the fix by checking quiz counts
    console.log('\n📊 Current Quiz Status:');
    const subjects = await prisma.subject.findMany({
      include: {
        chapters: {
          include: {
            _count: {
              select: { quizzes: true }
            },
            quizzes: {
              where: { isActive: true },
              select: { id: true, title: true, isActive: true }
            }
          }
        }
      }
    });

    subjects.forEach(subject => {
      console.log(`📖 ${subject.name}:`);
      subject.chapters.forEach(chapter => {
        console.log(`   📑 ${chapter.name}:`);
        console.log(`      Total Quiz Count: ${chapter._count.quizzes}`);
        console.log(`      Active Quiz Count: ${chapter.quizzes.length}`);
        chapter.quizzes.forEach(quiz => {
          console.log(`      🎯 ${quiz.title} (Active: ${quiz.isActive})`);
        });
      });
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixQuizIssues().catch(console.error);
