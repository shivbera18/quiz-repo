const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

async function deleteChapter() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node delete-chapter.js "Chapter Name"');
    console.log('Example: node delete-chapter.js "Arithmetic"');
    console.log('\nAvailable chapters:');
    
    const subjects = await prisma.subject.findMany({
      include: { chapters: true }
    });
    
    subjects.forEach(subject => {
      console.log(`\n${subject.name}:`);
      subject.chapters.forEach(chapter => {
        console.log(`  - ${chapter.name} (ID: ${chapter.id})`);
      });
    });
    
    await prisma.$disconnect();
    return;
  }
  
  const chapterName = args[0];
  
  try {
    // Find the chapter
    const chapter = await prisma.chapter.findFirst({
      where: { name: chapterName },
      include: { subject: true }
    });
    
    if (!chapter) {
      console.log(`Chapter "${chapterName}" not found.`);
      await prisma.$disconnect();
      return;
    }
    
    console.log(`Found chapter: ${chapter.name} in subject: ${chapter.subject.name}`);
    
    // Check if chapter has any quizzes
    const quizCount = await prisma.quiz.count({
      where: { chapterId: chapter.id }
    });
    
    if (quizCount > 0) {
      console.log(`Warning: This chapter has ${quizCount} quiz(es) associated with it.`);
      console.log('Deleting the chapter will also delete all associated quizzes.');
    }
    
    // Confirm deletion
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question(`Are you sure you want to delete "${chapterName}"? (y/N): `, async (answer) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        try {
          // Delete the chapter (quizzes will be deleted due to cascade)
          await prisma.chapter.delete({
            where: { id: chapter.id }
          });
          
          console.log(`✅ Chapter "${chapterName}" deleted successfully!`);
        } catch (error) {
          console.error('❌ Error deleting chapter:', error.message);
        }
      } else {
        console.log('Deletion cancelled.');
      }
      
      rl.close();
      await prisma.$disconnect();
    });
    
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
  }
}

deleteChapter();
