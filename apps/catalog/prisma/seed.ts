import { PrismaClient } from "../src/generated/prisma/index.js"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding catalog-svc...")

  const quiz = await prisma.quiz.upsert({
    where: { id: "sample-quiz-001" },
    update: {
      title: "Sample Reasoning Test",
      description: "A sample quiz to test the system",
      timeLimit: 30,
      sections: JSON.stringify(["reasoning"]),
      questions: JSON.stringify(sampleQuestions),
      isActive: true,
      negativeMarking: true,
      negativeMarkValue: 0.25,
    },
    create: {
      id: "sample-quiz-001",
      title: "Sample Reasoning Test",
      description: "A sample quiz to test the system",
      timeLimit: 30,
      createdBy: "admin-001",
      sections: JSON.stringify(["reasoning"]),
      questions: JSON.stringify(sampleQuestions),
      isActive: true,
      negativeMarking: true,
      negativeMarkValue: 0.25,
    },
  })

  console.log("Seeded:", { quiz: quiz.title })
}

const sampleQuestions = [
  {
    id: "q1",
    section: "reasoning",
    question: "What comes next in the sequence: 2, 4, 8, 16, ?",
    options: ["24", "32", "30", "20"],
    correctAnswer: 1,
    explanation: "Each number is doubled: 2x2=4, 4x2=8, 8x2=16, 16x2=32",
  },
  {
    id: "q2",
    section: "reasoning",
    question: "If all cats are animals and some animals are pets, which must be true?",
    options: ["All cats are pets", "Some cats may be pets", "No cats are pets", "All pets are cats"],
    correctAnswer: 1,
    explanation: "Since cats are animals and some animals are pets, it's possible that some cats may be pets.",
  },
]

main()
  .catch((e) => {
    console.error("Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
