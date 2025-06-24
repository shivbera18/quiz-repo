import { PrismaClient } from "@/lib/generated/prisma/client"

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    // Optionally, add authentication here
    const results = await prisma.quizResult.findMany({
      include: {
        quiz: true,
        user: true,
      },
    })
    const quizzes = await prisma.quiz.findMany()
    return Response.json({ results, quizzes })
  } catch (error) {
    return Response.json({ message: "Internal server error" }, { status: 500 })
  }
}
