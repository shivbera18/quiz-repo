import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"

const prisma = new PrismaClient()

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

    const { name, description, icon, color } = await request.json()

    if (!name) {
      return NextResponse.json({ message: "Subject name is required" }, { status: 400 })
    }

    // Check if subject already exists
    const existingSubject = await prisma.subject.findFirst({
      where: { name }
    })

    if (existingSubject) {
      return NextResponse.json({ message: "Subject already exists" }, { status: 409 })
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        description: description || "",
        icon: icon || "📚",
        color: color || "#3B82F6"
      }
    })

    return NextResponse.json({ subject })
  } catch (error) {
    console.error("Error creating subject:", error)
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
    const subjectId = searchParams.get("id")

    if (!subjectId) {
      return NextResponse.json({ message: "Subject ID is required" }, { status: 400 })
    }

    // Check if subject has chapters with quizzes
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      include: {
        chapters: {
          include: {
            quizzes: true
          }
        }
      }
    })

    if (!subject) {
      return NextResponse.json({ message: "Subject not found" }, { status: 404 })
    }

    const hasQuizzes = subject.chapters.some(chapter => chapter.quizzes.length > 0)
    if (hasQuizzes) {
      return NextResponse.json({ 
        message: "Cannot delete subject that has chapters with quizzes. Please move or delete quizzes first." 
      }, { status: 409 })
    }

    // Delete chapters first, then subject
    await prisma.chapter.deleteMany({
      where: { subjectId }
    })

    await prisma.subject.delete({
      where: { id: subjectId }
    })

    return NextResponse.json({ message: "Subject deleted successfully" })
  } catch (error) {
    console.error("Error deleting subject:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
