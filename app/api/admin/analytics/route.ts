import { PrismaClient } from "@/lib/generated/prisma"

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    console.log('📊 Admin analytics API called')
    
    // Optionally, add authentication here
    const results = await prisma.quizResult.findMany({
      include: {
        quiz: {
          select: {
            id: true,
            title: true
          }
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
      },
      orderBy: {
        date: 'desc'
      }
    })
    
    console.log(`📈 Found ${results.length} quiz results in database`)
    
    const quizzes = await prisma.quiz.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        questions: true,
        isActive: true,
        createdAt: true
      }
    })
    
    console.log(`📚 Found ${quizzes.length} quizzes in database`)
    
    // In development, log any results with missing quiz data
    if (process.env.NODE_ENV === 'development') {
      const problematicResults = results.filter(r => !r.quiz?.title)
      if (problematicResults.length > 0) {
        console.warn(`Found ${problematicResults.length} results without quiz titles:`, 
          problematicResults.map(r => ({ id: r.id, quizId: r.quizId })))
      }
    }
    
    return Response.json({ results, quizzes })
  } catch (error) {
    console.error("❌ Admin analytics API error:", error)
    return Response.json({ message: "Internal server error", error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
