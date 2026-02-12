import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma-client"

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

// POST - Subscribe to push notifications
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

    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const body = await request.json()
    const { endpoint, keys } = body

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return NextResponse.json({ message: "Invalid subscription data" }, { status: 400 })
    }

    // Check if subscription already exists
    const existingSubscription = await prisma.pushSubscription.findUnique({
      where: {
        userId_endpoint: {
          userId: user.id,
          endpoint
        }
      }
    })

    if (existingSubscription) {
      // Update existing subscription
      const updatedSubscription = await prisma.pushSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: request.headers.get("user-agent") || undefined,
          isActive: true,
          updatedAt: new Date(),
          lastUsedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: "Subscription updated successfully",
        subscription: updatedSubscription
      })
    } else {
      // Create new subscription
      const subscription = await prisma.pushSubscription.create({
        data: {
          userId: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: request.headers.get("user-agent") || undefined,
          isActive: true,
          lastUsedAt: new Date()
        }
      })

      return NextResponse.json({
        success: true,
        message: "Subscription created successfully",
        subscription
      })
    }

  } catch (error) {
    console.error("Error managing push subscription:", error)
    return NextResponse.json({ message: "Failed to manage subscription" }, { status: 500 })
  }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get("endpoint")

    if (!endpoint) {
      return NextResponse.json({ message: "Endpoint parameter required" }, { status: 400 })
    }

    // Find and deactivate the subscription
    const subscription = await prisma.pushSubscription.findUnique({
      where: {
        userId_endpoint: {
          userId: user.id,
          endpoint
        }
      }
    })

    if (!subscription) {
      return NextResponse.json({ message: "Subscription not found" }, { status: 404 })
    }

    await prisma.pushSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false }
    })

    return NextResponse.json({
      success: true,
      message: "Unsubscribed successfully"
    })

  } catch (error) {
    console.error("Error unsubscribing from push notifications:", error)
    return NextResponse.json({ message: "Failed to unsubscribe" }, { status: 500 })
  }
}