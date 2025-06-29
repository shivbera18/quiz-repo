const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function searchAllQuizzesAndChapters() {
  console.log('🔍 Comprehensive Search for All Quizzes and Chapters...\n');

  try {
    // 1. List ALL subjects and chapters
    console.log('📚 ALL SUBJECTS AND CHAPTERS:');
    const allSubjects = await prisma.subject.findMany({
      include: {
        chapters: {
          include: {
            _count: { select: { quizzes: true } },
            quizzes: {
              select: {
                id: true,
                title: true,
                isActive: true,
                createdAt: true
              },
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    allSubjects.forEach(subject => {
      console.log(`\n📖 Subject: "${subject.name}" (ID: ${subject.id})`);
      if (subject.chapters.length === 0) {
        console.log('   📑 No chapters found');
      } else {
        subject.chapters.forEach(chapter => {
          console.log(`   📑 Chapter: "${chapter.name}" (ID: ${chapter.id})`);
          console.log(`      Total Quizzes: ${chapter._count.quizzes}`);
          
          if (chapter.quizzes.length > 0) {
            chapter.quizzes.forEach(quiz => {
              console.log(`      🎯 "${quiz.title}" (Active: ${quiz.isActive}, Created: ${quiz.createdAt.toISOString().split('T')[0]})`);
            });
          } else {
            console.log('      No quizzes in this chapter');
          }
        });
      }
    });

    // 2. Search for quizzes by partial name matches
    console.log('\n🔍 SEARCHING FOR QUIZ NAME PATTERNS:');
    
    const searchTerms = [
      'ratio',
      'proportion', 
      'basic',
      'l1',
      'level 1',
      'ratios'
    ];

    for (const term of searchTerms) {
      const matchingQuizzes = await prisma.quiz.findMany({
        where: {
          title: {
            contains: term,
            mode: 'insensitive'
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

      if (matchingQuizzes.length > 0) {
        console.log(`\nSearching for "${term}"`);
        matchingQuizzes.forEach(quiz => {
          console.log(`   📝 "${quiz.title}"`);
          console.log(`      Active: ${quiz.isActive}`);
          console.log(`      Chapter: ${quiz.chapter?.name || 'NULL'}`);
          console.log(`      Subject: ${quiz.chapter?.subject?.name || 'NULL'}`);
          console.log(`      Created: ${quiz.createdAt}`);
        });
      }
    }

    // 3. Check recent quiz creation activity
    console.log('\n⏰ RECENT QUIZ CREATION (Last 24 hours):');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentQuizzes = await prisma.quiz.findMany({
      where: {
        createdAt: {
          gte: yesterday
        }
      },
      include: {
        chapter: {
          include: {
            subject: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (recentQuizzes.length > 0) {
      recentQuizzes.forEach(quiz => {
        console.log(`   📝 "${quiz.title}"`);
        console.log(`      Created: ${quiz.createdAt}`);
        console.log(`      Active: ${quiz.isActive}`);
        console.log(`      Chapter: ${quiz.chapter?.name || 'NULL'}`);
        console.log(`      Subject: ${quiz.chapter?.subject?.name || 'NULL'}`);
        console.log('');
      });
    } else {
      console.log('   No quizzes created in the last 24 hours');
    }

    // 4. Test what student would see for each chapter
    console.log('\n🏫 STUDENT PORTAL VIEW FOR ALL CHAPTERS:');
    const chaptersWithQuizzes = await prisma.chapter.findMany({
      include: {
        subject: true,
        quizzes: {
          where: { isActive: true },
          select: {
            id: true,
            title: true,
            timeLimit: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    chaptersWithQuizzes.forEach(chapter => {
      console.log(`\n📑 ${chapter.subject.name} > ${chapter.name}`);
      if (chapter.quizzes.length > 0) {
        console.log(`   Student will see ${chapter.quizzes.length} quiz(es):`);
        chapter.quizzes.forEach((quiz, index) => {
          console.log(`   ${index + 1}. "${quiz.title}" (${quiz.timeLimit} mins)`);
        });
      } else {
        console.log('   ❌ Student will see: No quizzes available');
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

searchAllQuizzesAndChapters().catch(console.error);
