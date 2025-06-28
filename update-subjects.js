const { PrismaClient } = require('./lib/generated/prisma');

const prisma = new PrismaClient();

async function updateSubjects() {
  try {
    console.log('🔄 Updating subjects to match your requirements...\n');

    // First, remove chapter references from quizzes
    console.log('Removing chapter references from quizzes...');
    await prisma.quiz.updateMany({
      data: { chapterId: null }
    });

    // Clear existing chapters and subjects
    console.log('Deleting existing chapters...');
    await prisma.chapter.deleteMany({});
    
    console.log('Deleting existing subjects...');
    await prisma.subject.deleteMany({});
    
    // Create new subjects with chapters
    const subjectsData = [
      {
        name: 'Quantitative Aptitude',
        description: 'Mathematical and numerical reasoning',
        icon: '🔢',
        color: '#3B82F6',
        chapters: [
          { name: 'Arithmetic', description: 'Basic arithmetic operations' },
          { name: 'Algebra', description: 'Linear and quadratic equations' },
          { name: 'Geometry', description: 'Shapes, angles, and spatial reasoning' },
          { name: 'Data Interpretation', description: 'Charts, graphs, and data analysis' },
          { name: 'Number System', description: 'Properties of numbers' }
        ]
      },
      {
        name: 'Reasoning Ability',
        description: 'Logical and analytical thinking',
        icon: '🧠',
        color: '#10B981',
        chapters: [
          { name: 'Logical Reasoning', description: 'Logical deduction and inference' },
          { name: 'Analytical Reasoning', description: 'Pattern recognition and analysis' },
          { name: 'Verbal Reasoning', description: 'Word-based logical problems' },
          { name: 'Non-Verbal Reasoning', description: 'Visual and spatial reasoning' },
          { name: 'Critical Reasoning', description: 'Argument evaluation' }
        ]
      },
      {
        name: 'English Language',
        description: 'Grammar, vocabulary, and comprehension',
        icon: '📝',
        color: '#8B5CF6',
        chapters: [
          { name: 'Grammar', description: 'English grammar rules and usage' },
          { name: 'Vocabulary', description: 'Word meanings and usage' },
          { name: 'Reading Comprehension', description: 'Text analysis and understanding' },
          { name: 'Sentence Correction', description: 'Error identification and correction' },
          { name: 'Para Jumbles', description: 'Sentence arrangement' }
        ]
      },
      {
        name: 'General Awareness',
        description: 'Current affairs and general knowledge',
        icon: '🌍',
        color: '#F59E0B',
        chapters: [
          { name: 'Current Affairs', description: 'Recent events and news' },
          { name: 'History', description: 'Historical events and figures' },
          { name: 'Geography', description: 'World and Indian geography' },
          { name: 'Politics', description: 'Political science and governance' },
          { name: 'Economics', description: 'Basic economic concepts' }
        ]
      },
      {
        name: 'Computer Knowledge',
        description: 'Computer fundamentals and technology',
        icon: '💻',
        color: '#EF4444',
        chapters: [
          { name: 'Computer Fundamentals', description: 'Basic computer concepts' },
          { name: 'Operating Systems', description: 'OS concepts and functionality' },
          { name: 'MS Office', description: 'Microsoft Office applications' },
          { name: 'Internet & Networking', description: 'Web and network basics' },
          { name: 'Programming Basics', description: 'Basic programming concepts' }
        ]
      }
    ];

    for (const subjectData of subjectsData) {
      const { chapters, ...subject } = subjectData;
      
      console.log(`Creating subject: ${subject.name}`);
      const createdSubject = await prisma.subject.create({
        data: subject
      });

      for (const chapterData of chapters) {
        console.log(`  - Creating chapter: ${chapterData.name}`);
        await prisma.chapter.create({
          data: {
            ...chapterData,
            subjectId: createdSubject.id
          }
        });
      }
    }

    console.log('\n✅ Successfully updated subjects and chapters!');
    console.log('\nNew subjects:');
    const newSubjects = await prisma.subject.findMany({
      include: { chapters: true }
    });
    
    for (const subject of newSubjects) {
      console.log(`📚 ${subject.name} (${subject.chapters.length} chapters)`);
      for (const chapter of subject.chapters) {
        console.log(`   - ${chapter.name}`);
      }
    }

  } catch (error) {
    console.error('❌ Error updating subjects:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSubjects();
