const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function fixOrphanedQuizzes() {
  try {
    console.log('🔧 Fixing orphaned quizzes in production database...');
    
    // Get the Ratio and Proportion chapter ID
    const chapter = await prisma.chapter.findFirst({
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
    
    if (!chapter) {
      console.log('❌ Could not find Ratio and Proportion chapter');
      return;
    }
    
    console.log(`✅ Found chapter: "${chapter.name}" (ID: ${chapter.id}) in subject "${chapter.subject.name}"`);
    
    // Find all quizzes with null chapterId that contain "Ratio" in their title
    const orphanedQuizzes = await prisma.quiz.findMany({
      where: {
        AND: [
          { chapterId: null },
          {
            title: {
              contains: 'Ratio',
              mode: 'insensitive'
            }
          }
        ]
      }
    });
    
    console.log(`📋 Found ${orphanedQuizzes.length} orphaned Ratio quizzes:`);
    orphanedQuizzes.forEach((quiz, index) => {
      console.log(`${index + 1}. "${quiz.title}" (ID: ${quiz.id})`);
    });
    
    if (orphanedQuizzes.length === 0) {
      console.log('✅ No orphaned quizzes found to fix');
      return;
    }
    
    // Update all orphaned Ratio quizzes to belong to the Ratio and Proportion chapter
    const updateResult = await prisma.quiz.updateMany({
      where: {
        AND: [
          { chapterId: null },
          {
            title: {
              contains: 'Ratio',
              mode: 'insensitive'
            }
          }
        ]
      },
      data: {
        chapterId: chapter.id
      }
    });
    
    console.log(`✅ Successfully updated ${updateResult.count} quizzes to belong to "${chapter.name}" chapter`);
    
    // Verify the fix
    console.log('\n🔍 Verifying the fix...');
    const fixedQuizzes = await prisma.quiz.findMany({
      where: {
        chapterId: chapter.id
      },
      select: {
        id: true,
        title: true,
        chapterId: true,
        isActive: true
      }
    });
    
    console.log(`📊 Quizzes now in "${chapter.name}" chapter: ${fixedQuizzes.length}`);
    fixedQuizzes.forEach((quiz, index) => {
      console.log(`${index + 1}. "${quiz.title}" (Active: ${quiz.isActive})`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing orphaned quizzes:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixOrphanedQuizzes();
