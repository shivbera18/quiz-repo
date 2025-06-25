import { PrismaClient } from '../lib/generated/prisma'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Neon PostgreSQL database...')

  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@quizapp.com' },
    update: {},
    create: {
      id: 'admin-001',
      name: 'Admin User',
      email: 'admin@quizapp.com',
      password: 'admin123', // Change this in production!
      isAdmin: true,
      userType: 'admin',
      totalQuizzes: 0,
      averageScore: 0,
    },
  })

  // Create test student
  const student = await prisma.user.upsert({
    where: { email: 'student@test.com' },
    update: {},
    create: {
      id: 'student-001',
      name: 'Test Student',
      email: 'student@test.com',
      password: 'student123',
      isAdmin: false,
      userType: 'student',
      totalQuizzes: 0,
      averageScore: 0,
    },
  })

  // Create sample quiz
  const quiz = await prisma.quiz.upsert({
    where: { id: 'sample-quiz-001' },
    update: {},
    create: {
      id: 'sample-quiz-001',
      title: 'Sample Reasoning Test',
      description: 'A sample quiz to test the system',
      timeLimit: 30,
      createdBy: admin.id,
      sections: ['reasoning'],
      questions: [
        {
          id: 'q1',
          section: 'reasoning',
          question: 'What comes next in the sequence: 2, 4, 8, 16, ?',
          options: ['24', '32', '30', '20'],
          correctAnswer: 1,
          explanation: 'Each number is doubled: 2×2=4, 4×2=8, 8×2=16, 16×2=32'
        },
        {
          id: 'q2',
          section: 'reasoning',
          question: 'If all cats are animals and some animals are pets, which must be true?',
          options: [
            'All cats are pets',
            'Some cats may be pets',
            'No cats are pets',
            'All pets are cats'
          ],
          correctAnswer: 1,
          explanation: 'Since cats are animals and some animals are pets, it\'s possible that some cats may be pets.'
        }
      ],
      isActive: true,
      negativeMarking: true,
      negativeMarkValue: 0.25,
    },
  })

  console.log('✅ Seeding completed!')
  console.log('Admin user:', admin)
  console.log('Test student:', student)
  console.log('Sample quiz:', quiz)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
