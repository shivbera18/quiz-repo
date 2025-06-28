const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function cleanupTestData() {
  try {
    console.log('Cleaning up test data...');
    
    // Delete test subjects (and their chapters will be deleted due to cascade)
    const testSubjectsDeleted = await prisma.subject.deleteMany({
      where: {
        name: {
          in: ['Test Subject']
        }
      }
    });
    
    // Delete test chapters
    const testChaptersDeleted = await prisma.chapter.deleteMany({
      where: {
        name: {
          in: ['Test Chapter', 'ffgs', 'bfdfg']
        }
      }
    });
    
    console.log(`Deleted ${testSubjectsDeleted.count} test subjects`);
    console.log(`Deleted ${testChaptersDeleted.count} test chapters`);
    
    // Display final subjects
    console.log('\nFinal subjects:');
    const subjects = await prisma.subject.findMany({
      include: {
        chapters: true
      }
    });
    
    subjects.forEach(subject => {
      console.log(`- ${subject.name} (${subject.chapters.length} chapters)`);
      subject.chapters.forEach(chapter => {
        console.log(`  - ${chapter.name}`);
      });
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupTestData();
