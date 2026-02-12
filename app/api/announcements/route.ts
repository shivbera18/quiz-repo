import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-client"
import { sendPushNotificationToAllUsers } from "@/lib/push-notification-utils"

export const dynamic = 'force-dynamic'

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

// GET - Fetch all active announcements for users
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
    
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Get all active announcements that haven't expired
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        readBy: {
          where: {
            userId: user.id
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Transform to include read status
    const announcementsWithReadStatus = announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      priority: a.priority,
      createdAt: a.createdAt,
      expiresAt: a.expiresAt,
      isRead: a.readBy.length > 0
    }))

    // Count unread
    const unreadCount = announcementsWithReadStatus.filter(a => !a.isRead).length

    return NextResponse.json({
      announcements: announcementsWithReadStatus,
      unreadCount
    })

  } catch (error) {
    console.error("Error fetching announcements:", error)
    return NextResponse.json({ message: "Failed to fetch announcements" }, { status: 500 })
  }
}

// POST - Create a new announcement (admin only)
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

    const user = await validateTokenAndGetUser(token)
    
    if (!user || !user.isAdmin) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { title, content, priority, expiresAt } = body

    if (!title || !content) {
      return NextResponse.json({ message: "Title and content are required" }, { status: 400 })
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || "normal",
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: user.id
      }
    })

    // Send push notification to all users (except the creator)
    try {
      const pushResult = await sendPushNotificationToAllUsers({
        title: announcement.title,
        body: announcement.content.length > 100
          ? announcement.content.substring(0, 100) + '...'
          : announcement.content,
        url: '/dashboard',
        priority: announcement.priority as 'low' | 'normal' | 'high' | 'urgent',
        tag: `announcement-${announcement.id}`,
        id: announcement.id
      }, user.id)

      console.log(`Push notification sent: ${pushResult.sent} successful, ${pushResult.failed} failed`)
    } catch (pushError) {
      console.error("Error sending push notification:", pushError)
      // Don't fail the announcement creation if push notification fails
    }

    return NextResponse.json({ 
      success: true, 
      announcement,
      message: "Announcement created successfully" 
    })

  } catch (error) {
    console.error("Error creating announcement:", error)
    return NextResponse.json({ message: "Failed to create announcement" }, { status: 500 })
  }
}
