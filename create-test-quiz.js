const { PrismaClient } = require('./lib/generated/prisma/client')

const prisma = new PrismaClient()

async function createTestQuiz() {
  try {
    console.log('Creating test quiz...')
    
    const testQuestions = [
      {
        id: "q1",
        section: "reasoning",
        question: "What comes next in the series: 2, 4, 8, 16, ?",
        options: ["24", "32", "30", "28"],
        correctAnswer: 1,
        explanation: "Each number is doubled: 2×2=4, 4×2=8, 8×2=16, 16×2=32"
      },
      {
        id: "q2", 
        section: "quantitative",
        question: "If x + 5 = 12, what is the value of x?",
        options: ["5", "6", "7", "8"],
        correctAnswer: 2,
        explanation: "x + 5 = 12, so x = 12 - 5 = 7"
      },
      {
        id: "q3",
        section: "english", 
        question: "Choose the correct synonym for 'abundant':",        options: ["scarce", "plentiful", "limited", "small"],
        correctAnswer: 1,
        explanation: "Abundant means existing in large quantities, so plentiful is the correct synonym"
      }
    ]
    
    const quiz = await prisma.quiz.create({
      data: {
        title: "Sample Quiz Test",
        description: "A test quiz to verify the student portal functionality",
        timeLimit: 30,
        sections: JSON.stringify(["reasoning", "quantitative", "english"]), // Stringify for SQLite
        questions: JSON.stringify(testQuestions),
        isActive: true,
        createdBy: "admin@bank.com"
      }
    })
    
    console.log('Test quiz created successfully!')
    console.log('Quiz ID:', quiz.id)
    console.log('Quiz Title:', quiz.title)
    console.log('Questions:', testQuestions.length)
    console.log('Is Active:', quiz.isActive)
    
  } catch (error) {
    console.error('Error creating test quiz:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestQuiz()
