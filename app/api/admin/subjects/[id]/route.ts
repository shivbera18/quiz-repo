import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// Force dynamic rendering to ensure fresh data
export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const { id } = params

    if (!id) {
      return NextResponse.json({ message: "Subject ID is required" }, { status: 400 })
    }

    // Check if subject exists
    const subject = await prisma.subject.findUnique({
      where: { id },
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

    // Check if subject has quizzes in any of its chapters
    const totalQuizzes = subject.chapters.reduce((total, chapter) => total + chapter.quizzes.length, 0)
    if (totalQuizzes > 0) {
      return NextResponse.json({ 
        message: `Cannot delete subject. It has ${totalQuizzes} quiz(es) across its chapters.` 
      }, { status: 409 })
    }

    // Delete all chapters first (due to foreign key constraints)
    await prisma.chapter.deleteMany({
      where: { subjectId: id }
    })

    // Delete the subject
    await prisma.subject.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: "Subject and its chapters deleted successfully",
      deletedSubject: {
        id: subject.id,
        name: subject.name,
        deletedChaptersCount: subject.chapters.length
      }
    })
  } catch (error) {
    console.error("Error deleting subject:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const { id } = params
    const { name, description, icon, color } = await request.json()

    if (!id) {
      return NextResponse.json({ message: "Subject ID is required" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ message: "Subject name is required" }, { status: 400 })
    }

    // Check if subject exists
    const existingSubject = await prisma.subject.findUnique({
      where: { id }
    })

    if (!existingSubject) {
      return NextResponse.json({ message: "Subject not found" }, { status: 404 })
    }

    // Check if another subject with the same name exists (excluding current one)
    const duplicateSubject = await prisma.subject.findFirst({
      where: { 
        name,
        id: { not: id }
      }
    })

    if (duplicateSubject) {
      return NextResponse.json({ message: "Subject with this name already exists" }, { status: 409 })
    }

    // Update the subject
    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: {
        name,
        description: description || "",
        icon: icon || "📚",
        color: color || "#3B82F6"
      }
    })

    return NextResponse.json({ 
      message: "Subject updated successfully",
      subject: updatedSubject
    })
  } catch (error) {
    console.error("Error updating subject:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
