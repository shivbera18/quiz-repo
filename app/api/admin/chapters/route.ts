import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const { name, description, subjectId } = await request.json()

    if (!name || !subjectId) {
      return NextResponse.json({ message: "Chapter name and subject ID are required" }, { status: 400 })
    }

    // Verify subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId }
    })

    if (!subject) {
      return NextResponse.json({ message: "Subject not found" }, { status: 404 })
    }

    // Check if chapter already exists in this subject
    const existingChapter = await prisma.chapter.findFirst({
      where: { 
        name,
        subjectId
      }
    })

    if (existingChapter) {
      return NextResponse.json({ message: "Chapter already exists in this subject" }, { status: 409 })
    }

    const chapter = await prisma.chapter.create({
      data: {
        name,
        description: description || "",
        subjectId
      }
    })

    return NextResponse.json({ chapter })
  } catch (error) {
    console.error("Error creating chapter:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const chapterId = searchParams.get("id")

    if (!chapterId) {
      return NextResponse.json({ message: "Chapter ID is required" }, { status: 400 })
    }

    // Check if chapter has quizzes
    const chapter = await prisma.chapter.findUnique({
      where: { id: chapterId },
      include: { quizzes: true }
    })

    if (!chapter) {
      return NextResponse.json({ message: "Chapter not found" }, { status: 404 })
    }

    if (chapter.quizzes.length > 0) {
      return NextResponse.json({ 
        message: "Cannot delete chapter that has quizzes. Please move or delete quizzes first." 
      }, { status: 409 })
    }

    await prisma.chapter.delete({
      where: { id: chapterId }
    })

    return NextResponse.json({ message: "Chapter deleted successfully" })
  } catch (error) {
    console.error("Error deleting chapter:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
