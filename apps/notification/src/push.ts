import webpush, { WebPushError } from "web-push"
import type { PushSendRequestedData } from "@quiz/contracts"
import { PrismaClient } from "./generated/prisma/index.js"

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
const vapidEmail = process.env.VAPID_EMAIL
const vapidConfigured = Boolean(vapidPublicKey && vapidPrivateKey && vapidEmail)

if (vapidConfigured) {
  webpush.setVapidDetails(`mailto:${vapidEmail}`, vapidPublicKey!, vapidPrivateKey!)
}

type PushPayload = PushSendRequestedData["payload"]

export async function sendPushToSubscription(
  prisma: PrismaClient,
  subscriptionId: string,
  payload: PushPayload
): Promise<{ sent: boolean; reason?: string }> {
  if (!vapidConfigured) {
    return { sent: false, reason: "VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_EMAIL must all be configured" }
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
    if (err instanceof WebPushError && err.statusCode >= 400 && err.statusCode < 500) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await prisma.pushSubscription.update({ where: { id: subscription.id }, data: { isActive: false } })
      }
      return { sent: false, reason: `push service rejected subscription (${err.statusCode})` }
    }
    throw err
  }
}
