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

    console.log('🗑️ Delete request received:', { resultId, userId, quizId })

    // Validate admin permissions (you can add more sophisticated auth here)
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log('❌ Unauthorized delete attempt')
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (resultId) {
      // Delete specific result
      console.log('🗑️ Deleting specific result:', resultId)
      
      // First check if the result exists
      const existingResult = await prisma.quizResult.findUnique({
        where: { id: resultId }
      })
      
      if (!existingResult) {
        console.log('❌ Result not found:', resultId)
        return NextResponse.json({ error: "Result not found" }, { status: 404 })
      }
      
      console.log('✅ Found result to delete:', { id: existingResult.id, userId: existingResult.userId })
      
      const deletedResult = await prisma.quizResult.delete({
        where: { id: resultId }
      })
      
      console.log('✅ Result deleted successfully:', deletedResult.id)
      return NextResponse.json({ message: "Quiz result deleted successfully", deletedId: deletedResult.id })
    } else if (userId && quizId) {
      // Delete all results for a specific user and quiz
      console.log('🗑️ Deleting results for user and quiz:', { userId, quizId })
      
      const deleteResult = await prisma.quizResult.deleteMany({
        where: { 
          userId: userId,
          quizId: quizId
        }
      })
      
      console.log('✅ Deleted results count:', deleteResult.count)
      return NextResponse.json({ message: "User quiz results deleted successfully", deletedCount: deleteResult.count })
    } else if (userId) {
      // Delete all results for a specific user
      console.log('🗑️ Deleting all results for user:', userId)
      
      const deleteResult = await prisma.quizResult.deleteMany({
        where: { userId: userId }
      })
      
      console.log('✅ Deleted results count:', deleteResult.count)
      return NextResponse.json({ message: "All user results deleted successfully", deletedCount: deleteResult.count })
    } else if (quizId) {
      // Delete all results for a specific quiz
      console.log('🗑️ Deleting all results for quiz:', quizId)
      
      const deleteResult = await prisma.quizResult.deleteMany({
        where: { quizId: quizId }
      })
      
      console.log('✅ Deleted results count:', deleteResult.count)
      return NextResponse.json({ message: "All quiz results deleted successfully", deletedCount: deleteResult.count })
    } else {
      console.log('❌ Missing required parameters')
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

  } catch (error) {
    console.error("❌ Error deleting quiz result:", error)
    return NextResponse.json({ 
      error: "Internal server error", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 })
  }
}
