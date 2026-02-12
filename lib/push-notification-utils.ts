import webpush from 'web-push'
import { prisma } from './prisma-client'

// Lazy VAPID configuration
let vapidConfigured = false

function configureVapidIfNeeded() {
  if (!vapidConfigured && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL}`,
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    )
    vapidConfigured = true
  }
}

export interface PushNotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  tag?: string
  id?: string
}

export async function sendPushNotificationToUser(
  userId: string,
  payload: PushNotificationPayload
) {
  configureVapidIfNeeded()

  // Check if VAPID keys are configured
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured. Skipping push notifications.')
    return { success: false, sent: 0, failed: 0, error: 'VAPID keys not configured' }
  }

  try {
    // Get all active subscriptions for the user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true
      }
    })

    if (subscriptions.length === 0) {
      console.log(`No active subscriptions found for user ${userId}`)
      return { success: true, sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0

    // Send notification to each subscription
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth
          }
        }

        const notificationPayload = {
          title: payload.title,
          body: payload.body,
          icon: payload.icon || '/icons/icon-192x192.svg',
          badge: payload.badge || '/icons/icon-192x192.svg',
          data: {
            url: payload.url || '/dashboard',
            id: payload.id,
            priority: payload.priority
          },
          tag: payload.tag || 'announcement',
          requireInteraction: payload.priority === 'urgent' || payload.priority === 'high'
        }

        await webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload))

        // Update last used timestamp
        await prisma.pushSubscription.update({
          where: { id: subscription.id },
          data: { lastUsedAt: new Date() }
        })

        sent++
        console.log(`Push notification sent to user ${userId} subscription ${subscription.id}`)
      } catch (error: any) {
        console.error(`Failed to send push notification to subscription ${subscription.id}:`, error)

        // If the subscription is invalid (410 Gone), mark it as inactive
        if (error.statusCode === 410) {
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { isActive: false }
          })
          console.log(`Marked subscription ${subscription.id} as inactive`)
        }

        failed++
      }
    })

    await Promise.all(sendPromises)

    return { success: true, sent, failed }
  } catch (error) {
    console.error('Error sending push notification:', error)
    return { success: false, sent: 0, failed: 1, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function sendPushNotificationToAllUsers(
  payload: PushNotificationPayload,
  excludeUserId?: string
) {
  configureVapidIfNeeded()

  // Check if VAPID keys are configured
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured. Skipping push notifications.')
    return { success: false, sent: 0, failed: 0, error: 'VAPID keys not configured' }
  }

  try {
    // Get all active subscriptions
    const whereClause: any = { isActive: true }
    if (excludeUserId) {
      whereClause.userId = { not: excludeUserId }
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: whereClause,
      select: {
        id: true,
        userId: true,
        endpoint: true,
        p256dh: true,
        auth: true
      }
    })

    if (subscriptions.length === 0) {
      console.log('No active subscriptions found')
      return { success: true, sent: 0, failed: 0 }
    }

    // Group subscriptions by user to avoid duplicate notifications
    const userSubscriptions = new Map<string, typeof subscriptions[0][]>()

    subscriptions.forEach(sub => {
      if (!userSubscriptions.has(sub.userId)) {
        userSubscriptions.set(sub.userId, [])
      }
      userSubscriptions.get(sub.userId)!.push(sub)
    })

    let totalSent = 0
    let totalFailed = 0

    // Send to each user
    const sendPromises = Array.from(userSubscriptions.entries()).map(async ([userId, userSubs]) => {
      let userSent = 0
      let userFailed = 0

      const subPromises = userSubs.map(async (subscription) => {
        try {
          const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth
            }
          }

          const notificationPayload = {
            title: payload.title,
            body: payload.body,
            icon: payload.icon || '/icons/icon-192x192.svg',
            badge: payload.badge || '/icons/icon-192x192.svg',
            data: {
              url: payload.url || '/dashboard',
              id: payload.id,
              priority: payload.priority
            },
            tag: payload.tag || 'announcement',
            requireInteraction: payload.priority === 'urgent' || payload.priority === 'high'
          }

          await webpush.sendNotification(pushSubscription, JSON.stringify(notificationPayload))

          // Update last used timestamp
          await prisma.pushSubscription.update({
            where: { id: subscription.id },
            data: { lastUsedAt: new Date() }
          })

          userSent++
        } catch (error: any) {
          console.error(`Failed to send push notification to subscription ${subscription.id}:`, error)

          // If the subscription is invalid (410 Gone), mark it as inactive
          if (error.statusCode === 410) {
            await prisma.pushSubscription.update({
              where: { id: subscription.id },
              data: { isActive: false }
            })
            console.log(`Marked subscription ${subscription.id} as inactive`)
          }

          userFailed++
        }
      })

      await Promise.all(subPromises)

      totalSent += userSent
      totalFailed += userFailed

      console.log(`Sent ${userSent} notifications to user ${userId}, ${userFailed} failed`)
    })

    await Promise.all(sendPromises)

    return { success: true, sent: totalSent, failed: totalFailed }
  } catch (error) {
    console.error('Error sending push notifications to all users:', error)
    return {
      success: false,
      sent: 0,
      failed: 1,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}