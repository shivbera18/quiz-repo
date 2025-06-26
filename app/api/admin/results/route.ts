import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"

const prisma = new PrismaClient()

export async function DELETE(request: NextRequest) {
  try {
    // Get the result ID from the URL
    const url = new URL(request.url)
    const resultId = url.searchParams.get("id")
    const userId = url.searchParams.get("userId")
    const quizId = url.searchParams.get("quizId")

    // Validate admin permissions (you can add more sophisticated auth here)
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (resultId) {
      // Delete specific result
      await prisma.quizResult.delete({
        where: { id: resultId }
      })
      return NextResponse.json({ message: "Quiz result deleted successfully" })
    } else if (userId && quizId) {
      // Delete all results for a specific user and quiz
      await prisma.quizResult.deleteMany({
        where: { 
          userId: userId,
          quizId: quizId
        }
      })
      return NextResponse.json({ message: "User quiz results deleted successfully" })
    } else if (userId) {
      // Delete all results for a specific user
      await prisma.quizResult.deleteMany({
        where: { userId: userId }
      })
      return NextResponse.json({ message: "All user results deleted successfully" })
    } else if (quizId) {
      // Delete all results for a specific quiz
      await prisma.quizResult.deleteMany({
        where: { quizId: quizId }
      })
      return NextResponse.json({ message: "All quiz results deleted successfully" })
    } else {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

  } catch (error) {
    console.error("Error deleting quiz result:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
