// Simple database test
const { PrismaClient } = require('./lib/generated/prisma/client')

const testDatabase = async () => {
  console.log('🔍 Testing database connection...')
  
  try {
    const prisma = new PrismaClient()
    
    // Try to fetch existing quizzes
    const quizzes = await prisma.quiz.findMany({ take: 5 })
    console.log('✅ Database connection successful!')
    console.log(`Found ${quizzes.length} existing quizzes`)
    
    if (quizzes.length > 0) {
      console.log('Sample quiz:', quizzes[0].title)
    }
    
    await prisma.$disconnect()
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message)
  }
}

testDatabase()
