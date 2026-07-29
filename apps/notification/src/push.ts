// Ported from lib/push-notification-utils.ts's per-subscription send logic.
// The bulk fan-out entry points (sendPushNotificationToUser/ToAllUsers) are
// gone -- that inline nested-Promise.all loop over every subscription,
// awaited inside the announcement POST handler, was the actual bottleneck
// named in ARCHITECTURE.md. What's left here is just "send one push to one
// subscription," called by fanout-worker.ts once per PUSH_SEND_REQUESTED
// record instead of once per subscription inline in a request.
import webpush, { WebPushError } from "web-push"
import { PrismaClient } from "./generated/prisma/index.js"

let vapidConfigured = false

function configureVapidIfNeeded() {
  if (!vapidConfigured && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_EMAIL) {
    webpush.setVapidDetails(`mailto:${process.env.VAPID_EMAIL}`, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
    vapidConfigured = true
  }
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
  priority?: string
}

export async function sendPushToSubscription(
  prisma: PrismaClient,
  subscriptionId: string,
  payload: PushPayload
): Promise<{ sent: boolean; reason?: string }> {
  configureVapidIfNeeded()
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return { sent: false, reason: "VAPID keys not configured" }
  }

  const subscription = await prisma.pushSubscription.findUnique({ where: { id: subscriptionId } })
  if (!subscription || !subscription.isActive) {
    return { sent: false, reason: "subscription inactive or gone" }
  }

  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: "/icons/icon-192x192.svg",
        badge: "/icons/icon-192x192.svg",
        data: { url: payload.url || "/dashboard", priority: payload.priority },
        tag: payload.tag || "announcement",
        requireInteraction: payload.priority === "urgent" || payload.priority === "high",
      })
    )
    await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { lastUsedAt: new Date() } })
    return { sent: true }
  } catch (err) {
    if (err instanceof WebPushError && err.statusCode === 410) {
      await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { isActive: false } })
      return { sent: false, reason: "subscription expired (410), deactivated" }
    }
    return { sent: false, reason: err instanceof Error ? err.message : String(err) }
  }
}
