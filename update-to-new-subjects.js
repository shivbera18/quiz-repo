const { PrismaClient } = require('./lib/generated/prisma');
const prisma = new PrismaClient();

const subjects = [
  {
    name: 'Quant',
    chapters: ['Arithmetic', 'Algebra', 'Geometry', 'Data Interpretation']
  },
  {
    name: 'Reasoning',
    chapters: ['Logical Reasoning', 'Verbal Reasoning', 'Non-Verbal Reasoning', 'Analytical Reasoning']
  },
  {
    name: 'English',
    chapters: ['Grammar', 'Vocabulary', 'Reading Comprehension', 'Writing Skills']
  },
  {
    name: 'General Awareness',
    chapters: ['Current Affairs', 'History', 'Geography', 'Politics', 'Economics']
  },
  {
    name: 'Computer Knowledge',
    chapters: ['Hardware', 'Software', 'Programming', 'Internet & Networks', 'MS Office']
  }
];

async function updateSubjects() {
  try {
    console.log('Clearing existing subjects and chapters...');
    await prisma.chapter.deleteMany();
    await prisma.subject.deleteMany();

    console.log('Creating new subjects and chapters...');
    for (const subject of subjects) {
      console.log(`Creating subject: ${subject.name}`);
      await prisma.subject.create({
        data: {
          name: subject.name,
          description: `${subject.name} related topics`,
          chapters: {
            create: subject.chapters.map(chapterName => ({
              name: chapterName,
              description: `${chapterName} topics`
            }))
          }
        }
      });
    }

    console.log('Subjects and chapters updated successfully!');
    
    // Display the results
    const allSubjects = await prisma.subject.findMany({
      include: {
        chapters: true
      }
    });
    
    console.log('\nCurrent subjects:');
    allSubjects.forEach(subject => {
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

updateSubjects();
