const { PrismaClient } = require('./lib/generated/prisma/client')

const prisma = new PrismaClient()

async function checkQuizData() {
  try {
    console.log('Checking Quiz table data...')
    
    const quizzes = await prisma.quiz.findMany()
    console.log(`Found ${quizzes.length} quizzes:`)
    
    quizzes.forEach((quiz, index) => {
      console.log(`\n--- Quiz ${index + 1} ---`)
      console.log('ID:', quiz.id)
      console.log('Title:', quiz.title)
      console.log('Description:', quiz.description)
      console.log('TimeLimit:', quiz.timeLimit)
      console.log('Sections:', quiz.sections)
      console.log('Questions type:', typeof quiz.questions)
      console.log('Questions value:', quiz.questions)
      console.log('Questions length:', 
        typeof quiz.questions === 'string' 
          ? JSON.parse(quiz.questions || '[]').length 
          : Array.isArray(quiz.questions) 
            ? quiz.questions.length 
            : 'Not an array'
      )
      console.log('IsActive:', quiz.isActive)
      console.log('CreatedAt:', quiz.createdAt)
      console.log('CreatedBy:', quiz.createdBy)
    })
    
  } catch (error) {
    console.error('Error checking Quiz data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkQuizData()
