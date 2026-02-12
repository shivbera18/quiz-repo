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

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = () => {
      // Check for all required APIs
      const hasNotification = 'Notification' in window
      const hasServiceWorker = 'serviceWorker' in navigator
      const hasPushManager = 'PushManager' in window

      // Push notifications require HTTPS (except localhost)
      const isSecure = typeof location !== 'undefined' && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')

      const supported = hasNotification && hasServiceWorker && hasPushManager && isSecure
      setIsSupported(supported)

      if (supported && hasNotification) {
        setPermission(Notification.permission)
      }
    }

    checkSupport()

    // Listen for permission changes
    const handlePermissionChange = () => {
      if ('Notification' in window) {
        setPermission(Notification.permission)
        // Re-check subscription when permission changes
        if (user && isSupported) {
          checkSubscriptionStatus()
        }
      }
    }

    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' }).then((permissionStatus) => {
        permissionStatus.addEventListener('change', handlePermissionChange)
        return () => permissionStatus.removeEventListener('change', handlePermissionChange)
      }).catch(() => {
        // Fallback for browsers that don't support permissions API
      })
    }

    // Listen for our custom permission change event
    window.addEventListener('permission-changed', handlePermissionChange)

    return () => {
      window.removeEventListener('permission-changed', handlePermissionChange)
    }
  }, [user, isSupported])

  // Check subscription status when user changes
  useEffect(() => {
    if (user && isSupported) {
      checkSubscriptionStatus()
    }
  }, [user, isSupported])

  const checkSubscriptionStatus = useCallback(async () => {
    if (!isSupported || !user) return

    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      setIsSubscribed(!!subscription)
    } catch (err) {
      console.error('Error checking subscription status:', err)
    }
  }, [isSupported, user])

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Push notifications are not supported')
    }

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permission'
      setError(errorMessage)
      throw err
    }
  }, [isSupported])

  const subscribe = useCallback(async () => {
    if (!isSupported || !user) {
      throw new Error('Cannot subscribe: missing requirements')
    }

    // Check current permission before proceeding
    const currentPermission = Notification.permission
    if (currentPermission !== 'granted') {
      throw new Error('Cannot subscribe: permission not granted')
    }

    setIsLoading(true)
    setError(null)

    try {
      const registration = await navigator.serviceWorker.ready

      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription()

      if (!subscription) {
        // Subscribe with userVisibleOnly: true for better UX
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
        })
      }

      if (!subscription) {
        throw new Error('Failed to create subscription')
      }

      // Convert subscription to the format expected by our API
      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: arrayBufferToBase64(subscription.getKey('auth')!)
        }
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
      // Re-check permission in case it changed
      setPermission(Notification.permission)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to subscribe'
      setError(errorMessage)
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
        // Get endpoint before unsubscribing
        const endpoint = subscription.endpoint

        // Unsubscribe from push service
        await subscription.unsubscribe()

        // Remove from server
        const response = await fetch(`/api/push-subscription?endpoint=${encodeURIComponent(endpoint)}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to remove subscription')
        }
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

// Utility functions for VAPID key conversion
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