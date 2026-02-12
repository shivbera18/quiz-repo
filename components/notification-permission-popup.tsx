"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { X, Bell, BellRing, AlertCircle } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useToast } from '@/hooks/use-toast'

interface NotificationPermissionPopupProps {
  isOpen: boolean
  onClose: () => void
}

export default function NotificationPermissionPopup({ isOpen, onClose }: NotificationPermissionPopupProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    requestPermission
  } = usePushNotifications()

  const { toast } = useToast()
  const [isEnabling, setIsEnabling] = useState(false)

  // Simple effect to close popup when conditions change
  useEffect(() => {
    if (isSubscribed || !isSupported || permission === 'denied') {
      onClose()
    }
  }, [isSubscribed, isSupported, permission, onClose])

  const handleEnableNotifications = async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive"
      })
      return
    }

    setIsEnabling(true)

    try {
      if (permission === 'default') {
        // Request permission first
        const newPermission = await requestPermission()

        if (newPermission === 'granted') {
          await subscribe()
          toast({
            title: "Notifications Enabled! 🎉",
            description: "You'll now receive instant updates about announcements and important news.",
          })
          onClose()
        } else {
          toast({
            title: "Permission Denied",
            description: "You can enable notifications later from your profile settings.",
            variant: "destructive"
          })
          onClose()
        }
      } else if (permission === 'granted') {
        await subscribe()
        toast({
          title: "Notifications Enabled! 🎉",
          description: "You'll now receive instant updates about announcements and important news.",
        })
        onClose()
      } else {
        // Permission is denied
        toast({
          title: "Notifications Blocked",
          description: "Please enable notifications in your browser settings and try again.",
          variant: "destructive"
        })
        onClose()
      }
    } catch (err) {
      console.error('Error enabling notifications:', err)
      toast({
        title: "Error",
        description: "Failed to enable notifications. Please try again.",
        variant: "destructive"
      })
      // Don't close on error - let user retry
      // onClose()
    } finally {
      setIsEnabling(false)
    }
  }

  const handleDismiss = () => {
    // Store dismissal in localStorage to avoid showing again soon
    localStorage.setItem('notification-popup-dismissed', Date.now().toString())
    onClose()
  }

  if (!isOpen || isSubscribed || permission === 'denied') {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-full max-w-sm animate-in slide-in-from-bottom-2 fade-in-0 duration-300 sm:right-4 sm:left-auto sm:bottom-4 sm:max-w-md">
      <Card className="border-4 border-black shadow-[8px_8px_0px_0px_#000] sm:shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.65)] mx-4 sm:mx-0">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary border-2 border-black">
                <BellRing className="h-4 w-4 sm:h-6 sm:w-6 text-black" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-lg">Stay Updated!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                  Never miss announcements
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-8 sm:w-8 shrink-0"
              onClick={handleDismiss}
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-muted/50 border-2 border-black">
              <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold">Get Instant Notifications</p>
                <p className="text-xs text-muted-foreground">
                  Receive updates about new quizzes and announcements directly on your device.
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border-2 border-destructive/20">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-xs text-destructive font-medium">{error}</p>
              </div>
            )}

            {!isSupported && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border-2 border-orange-500/20">
                <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                <p className="text-xs text-orange-600 font-medium">
                  Push notifications require a modern browser and HTTPS connection. Try using Chrome, Firefox, or Edge on a secure website.
                </p>
              </div>
            )}

            {permission === 'denied' && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-orange-500/10 border-2 border-orange-500/20">
                <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                <p className="text-xs text-orange-600 font-medium">
                  Notifications are blocked. Please enable them in your browser settings first.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 sm:gap-3 mt-4 sm:mt-6">
            <Button
              variant="outline"
              className="flex-1 border-2 border-black font-bold text-xs sm:text-sm"
              onClick={handleDismiss}
            >
              Maybe Later
            </Button>
            <Button
              className="flex-1 bg-primary border-2 border-black font-bold hover:bg-primary/90 text-xs sm:text-sm"
              onClick={handleEnableNotifications}
              disabled={isLoading || isEnabling || !isSupported || permission === 'denied'}
            >
              {isLoading || isEnabling ? 'Enabling...' : 'Enable'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-2 sm:mt-3 font-medium">
            You can change this anytime in your profile settings
          </p>
        </CardContent>
      </Card>
    </div>
  )
}