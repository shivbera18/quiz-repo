import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"

const prisma = new PrismaClient()

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
      return NextResponse.json({ message: "Chapter ID is required" }, { status: 400 })
    }

    // Check if chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { id },
      include: {
        quizzes: true
      }
    })

    if (!chapter) {
      return NextResponse.json({ message: "Chapter not found" }, { status: 404 })
    }

    // Check if chapter has quizzes
    if (chapter.quizzes && chapter.quizzes.length > 0) {
      return NextResponse.json({ 
        message: `Cannot delete chapter. It has ${chapter.quizzes.length} quiz(es) associated with it.` 
      }, { status: 409 })
    }

    // Delete the chapter
    await prisma.chapter.delete({
      where: { id }
    })

    return NextResponse.json({ 
      message: "Chapter deleted successfully",
      deletedChapter: {
        id: chapter.id,
        name: chapter.name
      }
    })
  } catch (error) {
    console.error("Error deleting chapter:", error)
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
    const { name, description, subjectId } = await request.json()

    if (!id) {
      return NextResponse.json({ message: "Chapter ID is required" }, { status: 400 })
    }

    if (!name || !subjectId) {
      return NextResponse.json({ message: "Chapter name and subject ID are required" }, { status: 400 })
    }

    // Check if chapter exists
    const existingChapter = await prisma.chapter.findUnique({
      where: { id }
    })

    if (!existingChapter) {
      return NextResponse.json({ message: "Chapter not found" }, { status: 404 })
    }

    // Verify subject exists
    const subject = await prisma.subject.findUnique({
      where: { id: subjectId }
    })

    if (!subject) {
      return NextResponse.json({ message: "Subject not found" }, { status: 404 })
    }

    // Check if another chapter with the same name exists in this subject (excluding current one)
    const duplicateChapter = await prisma.chapter.findFirst({
      where: { 
        name,
        subjectId,
        id: { not: id }
      }
    })

    if (duplicateChapter) {
      return NextResponse.json({ message: "Chapter with this name already exists in this subject" }, { status: 409 })
    }

    // Update the chapter
    const updatedChapter = await prisma.chapter.update({
      where: { id },
      data: {
        name,
        description: description || "",
        subjectId
      }
    })

    return NextResponse.json({ 
      message: "Chapter updated successfully",
      chapter: updatedChapter
    })
  } catch (error) {
    console.error("Error updating chapter:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
