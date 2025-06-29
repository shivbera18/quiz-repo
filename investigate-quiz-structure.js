const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function investigateQuizStructure() {
  try {
    console.log('🔍 Investigating quiz structure and relationships...\n');
    
    // Check all quizzes
    const quizzes = await prisma.quiz.findMany({
      include: {
        chapter: {
          include: {
            subject: true
          }
        },
        questions: true
      }
    });
    
    console.log(`📊 Total quizzes: ${quizzes.length}\n`);
    
    if (quizzes.length === 0) {
      console.log('❌ No quizzes found!');
      return;
    }
    
    quizzes.forEach((quiz, index) => {
      console.log(`--- Quiz ${index + 1} ---`);
      console.log(`ID: ${quiz.id}`);
      console.log(`Title: ${quiz.title}`);
      console.log(`Chapter ID: ${quiz.chapterId || 'NULL - No chapter assigned!'}`);
      console.log(`Chapter: ${quiz.chapter?.name || 'No chapter'}`);
      console.log(`Subject: ${quiz.chapter?.subject?.name || 'No subject'}`);
      console.log(`Questions: ${quiz.questions?.length || 0}`);
      console.log(`Active: ${quiz.isActive}`);
      console.log('');
    });
    
    // Check subjects and chapters
    console.log('\n📚 Available subjects and chapters:');
    const subjects = await prisma.subject.findMany({
      include: {
        chapters: {
          include: {
            quizzes: true
          }
        }
      }
    });
    
    subjects.forEach(subject => {
      console.log(`\n📖 Subject: ${subject.name} (ID: ${subject.id})`);
      if (subject.chapters.length === 0) {
        console.log('   ❌ No chapters in this subject');
      } else {
        subject.chapters.forEach(chapter => {
          console.log(`   📝 Chapter: ${chapter.name} (ID: ${chapter.id})`);
          console.log(`      Quizzes: ${chapter.quizzes.length}`);
        });
      }
    });
    
    // Check if any quizzes are orphaned (no chapter)
    const orphanedQuizzes = quizzes.filter(quiz => !quiz.chapterId);
    if (orphanedQuizzes.length > 0) {
      console.log(`\n⚠️  ISSUE FOUND: ${orphanedQuizzes.length} orphaned quiz(es) with no chapter assignment!`);
      console.log('   These quizzes won\'t appear in the subject/chapter navigation.');
      console.log('   Orphaned quizzes:');
      orphanedQuizzes.forEach(quiz => {
        console.log(`   - "${quiz.title}" (ID: ${quiz.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateQuizStructure();
