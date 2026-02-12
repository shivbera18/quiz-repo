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

    if (!user || !user.isAdmin) {
      return NextResponse.json({ message: "Admin access required" }, { status: 403 })
    }

    const announcementId = params.id

    // Get the announcement
    const announcement = await prisma.announcement.findUnique({
      where: { id: announcementId }
    })

    if (!announcement) {
      return NextResponse.json({ message: "Announcement not found" }, { status: 404 })
    }

    // Send push notification to all users (except the admin who triggered it)
    try {
      const pushResult = await sendPushNotificationToAllUsers({
        title: announcement.title,
        body: announcement.content.length > 100
          ? announcement.content.substring(0, 100) + '...'
          : announcement.content,
        url: '/dashboard',
        priority: announcement.priority as 'low' | 'normal' | 'high' | 'urgent',
        tag: `announcement-${announcement.id}-repush`,
        id: announcement.id
      }, user.id)

      console.log(`Announcement repushed: ${pushResult.sent} successful, ${pushResult.failed} failed`)

      return NextResponse.json({
        success: true,
        message: "Announcement repushed successfully",
        sent: pushResult.sent,
        failed: pushResult.failed
      })

    } catch (pushError) {
      console.error("Error repushing announcement:", pushError)
      return NextResponse.json({
        success: false,
        message: "Failed to repush announcement",
        error: pushError instanceof Error ? pushError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error("Error repushing announcement:", error)
    return NextResponse.json({ message: "Failed to repush announcement" }, { status: 500 })
  }
}