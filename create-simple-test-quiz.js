// This file will help us create a test scenario to debug flash questions
const { PrismaClient } = require('./lib/generated/prisma/client')

const prisma = new PrismaClient()

async function createSimpleTestQuiz() {
  try {
    console.log('Creating simple test quiz for flash debugging...')
    
    // Create very simple questions with obvious correct answers
    const simpleQuestions = [
      {
        id: "test-1",
        section: "Math",
        question: "What is 2 + 2?",
        options: ["3", "4", "5", "6"],
        correctAnswer: 1, // Answer: "4"
        explanation: "2 + 2 = 4"
      },
      {
        id: "test-2", 
        section: "Math",
        question: "What is 5 × 2?",
        options: ["8", "9", "10", "12"],
        correctAnswer: 2, // Answer: "10"
        explanation: "5 × 2 = 10"
      },
      {
        id: "test-3",
        section: "Math", 
        question: "What is 10 - 3?",
        options: ["6", "7", "8", "9"],
        correctAnswer: 1, // Answer: "7"
        explanation: "10 - 3 = 7"
      },
      {
        id: "test-4",
        section: "Math", 
        question: "What is 15 ÷ 3?",
        options: ["4", "5", "6", "7"],
        correctAnswer: 1, // Answer: "5"
        explanation: "15 ÷ 3 = 5"
      }
    ]
    
    // Delete any existing test quiz
    await prisma.quiz.deleteMany({
      where: { title: "Flash Test Quiz" }
    })
    
    const quiz = await prisma.quiz.create({
      data: {
        title: "Flash Test Quiz",
        description: "Simple math quiz for testing flash questions",
        timeLimit: 10,
        sections: JSON.stringify(["Math"]),
        questions: JSON.stringify(simpleQuestions),
        isActive: true,
        createdBy: "test@test.com"
      }
    })
    
    console.log('Simple test quiz created successfully!')
    console.log('Quiz ID:', quiz.id)
    console.log('Quiz Title:', quiz.title)
    console.log('Questions:')
    
    simpleQuestions.forEach((q, i) => {
      console.log(`${i+1}. ${q.question}`)
      console.log(`   Options: ${q.options.join(', ')}`)
      console.log(`   Correct: ${q.options[q.correctAnswer]} (index ${q.correctAnswer})`)
      console.log('')
    })
    
  } catch (error) {
    console.error('Error creating test quiz:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createSimpleTestQuiz()
