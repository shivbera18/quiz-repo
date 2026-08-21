"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './use-auth'

interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface UsePushNotificationsReturn {
  isSupported: boolean
  permission: NotificationPermission
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
  requestPermission: () => Promise<NotificationPermission>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth()
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window && window.isSecureContext
    setIsSupported(supported)
    if (supported) setPermission(Notification.permission)
  }, [])

  const checkSubscriptionStatus = useCallback(async () => {
    if (!isSupported || !user) {
      setIsSubscribed(false)
      return
    }

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(Boolean(subscription) && Notification.permission === 'granted')
      setPermission(Notification.permission)
    } catch (err) {
      console.error('Error checking subscription status:', err)
      setIsSubscribed(false)
    }
  }, [isSupported, user])

  useEffect(() => {
    void checkSubscriptionStatus()
  }, [checkSubscriptionStatus])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) throw new Error('Push notifications are not supported')
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported || !user || typeof window === 'undefined') {
      throw new Error('Cannot subscribe: missing requirements')
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Cannot subscribe: permission not granted')
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidPublicKey) {
      throw new Error('Browser notifications are not configured')
    }

    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        })
      }

      const p256dh = subscription.getKey('p256dh')
      const auth = subscription.getKey('auth')
      if (!p256dh || !auth) throw new Error('Browser returned an invalid push subscription')

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: { p256dh: arrayBufferToBase64(p256dh), auth: arrayBufferToBase64(auth) },
      }

      // Send subscription to server
      const response = await fetch('/api/push-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(subscriptionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to save subscription')
      }

      setIsSubscribed(true)
      setPermission(Notification.permission)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe'
      setError(errorMessage)
      setIsSubscribed(false)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, user])

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) {
      throw new Error('Cannot unsubscribe: missing requirements')
    }

    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()

      if (subscription) {
        const endpoint = subscription.endpoint
        const response = await fetch(`/api/push-subscription?endpoint=${encodeURIComponent(endpoint)}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${user.token}` },
        })

        if (!response.ok && response.status !== 404) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to remove subscription')
        }
        await subscription.unsubscribe()
      }

      setIsSubscribed(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unsubscribe'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [isSupported, user])

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}