const { PrismaClient } = require('./lib/generated/prisma/client')

const prisma = new PrismaClient()

async function clearQuizTable() {
  try {
    console.log('Clearing Quiz table...')
    
    // Delete all quiz results first (foreign key constraint)
    const deletedResults = await prisma.quizResult.deleteMany()
    console.log(`Deleted ${deletedResults.count} quiz results`)
    
    // Delete all quizzes
    const deletedQuizzes = await prisma.quiz.deleteMany()
    console.log(`Deleted ${deletedQuizzes.count} quizzes`)
    
    console.log('Quiz table cleared successfully!')
  } catch (error) {
    console.error('Error clearing Quiz table:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearQuizTable()
