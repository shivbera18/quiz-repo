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

// GET - Fetch all announcements for admin (including inactive)
export async function GET(request: NextRequest) {
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

    const announcements = await prisma.announcement.findMany({
      include: {
        _count: {
          select: { readBy: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get total user count for read percentage
    const totalUsers = await prisma.user.count()

    const announcementsWithStats = announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      priority: a.priority,
      isActive: a.isActive,
      createdAt: a.createdAt,
      expiresAt: a.expiresAt,
      createdBy: a.createdBy,
      readCount: a._count.readBy,
      totalUsers,
      readPercentage: totalUsers > 0 ? Math.round((a._count.readBy / totalUsers) * 100) : 0
    }))

    return NextResponse.json({
      announcements: announcementsWithStats
    })

  } catch (error) {
    console.error("Error fetching admin announcements:", error)
    return NextResponse.json({ message: "Failed to fetch announcements" }, { status: 500 })
  }
}
