import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-client"

// Helper function to validate token and get user
async function validateTokenAndGetUser(token: string) {
  try {
    // Token format: ${userId}-${timestamp}-${random}
    // Find the timestamp (13-digit number) to determine where userId ends
    const parts = token.split('-')
    
    // Find index of timestamp (13-digit number starting with "17" for 2020s dates)
    let timestampIndex = -1
    for (let i = 0; i < parts.length; i++) {
      if (/^17\d{11}$/.test(parts[i])) {
        timestampIndex = i
        break
      }
    }
    
    if (timestampIndex <= 0) return null
    
    // userId is everything before the timestamp
    const userId = parts.slice(0, timestampIndex).join('-')
    if (!userId) return null
    
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })
    
    return user
  } catch {
    return null
  }
}

// POST - Mark an announcement as read
export async function POST(
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

    const user = await validateTokenAndGetUser(token)
    
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const announcementId = params.id

    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    })

    if (!announcement) {
      return NextResponse.json({ message: "Announcement not found" }, { status: 404 })
    }

    // Mark as read (upsert to handle duplicates)
    await prisma.announcementRead.upsert({
      where: {
        announcementId_userId: {
          announcementId,
          userId: user.id
        }
      },
      create: {
        announcementId,
        userId: user.id
      },
      update: {
        readAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: "Announcement marked as read" 
    })

  } catch (error) {
    console.error("Error marking announcement as read:", error)
    return NextResponse.json({ message: "Failed to mark as read" }, { status: 500 })
  }
}

// DELETE - Delete an announcement (admin only)
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

    const user = await validateTokenAndGetUser(token)
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 })
    }

    await prisma.announcement.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ 
      success: true, 
      message: "Announcement deleted" 
    })

  } catch (error) {
    console.error("Error deleting announcement:", error)
    return NextResponse.json({ message: "Failed to delete announcement" }, { status: 500 })
  }
}

// PUT - Update an announcement (admin only)
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

    const user = await validateTokenAndGetUser(token)
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, priority, isActive, expiresAt } = body

    const announcement = await prisma.announcement.update({
      where: { id: params.id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(priority && { priority }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null })
      }
    })

    return NextResponse.json({ 
      success: true, 
      announcement,
      message: "Announcement updated" 
    })

  } catch (error) {
    console.error("Error updating announcement:", error)
    return NextResponse.json({ message: "Failed to update announcement" }, { status: 500 })
  }
}
