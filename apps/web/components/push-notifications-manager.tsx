"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bell, BellOff, AlertCircle, CheckCircle } from 'lucide-react'
import { usePushNotifications } from '@/hooks/use-push-notifications'
import { useToast } from '@/hooks/use-toast'

interface PushNotificationsManagerProps {
  compact?: boolean
}

export default function PushNotificationsManager({ compact = false }: PushNotificationsManagerProps) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestPermission
  } = usePushNotifications()

  const { toast } = useToast()
  const [isEnabling, setIsEnabling] = useState(false)

  const handleToggleNotifications = async () => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported in this browser.",
        variant: "destructive"
      })
      return
    }

    // Prevent multiple simultaneous requests
    if (isEnabling || isLoading) {
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
            title: "Notifications Enabled",
            description: "You'll now receive push notifications for announcements.",
          })
        } else {
          toast({
            title: "Permission Denied",
            description: "Push notifications permission was denied.",
            variant: "destructive"
          })
        }
      } else if (permission === 'granted') {
        if (isSubscribed) {
          await unsubscribe()
          toast({
            title: "Notifications Disabled",
            description: "Push notifications have been disabled.",
          })
        } else {
          await subscribe()
          toast({
            title: "Notifications Enabled",
            description: "You'll now receive push notifications for announcements.",
          })
        }
      } else {
        // Permission is denied, show instructions
        toast({
          title: "Permission Required",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive"
        })
      }
    } catch (err) {
      console.error('Error toggling notifications:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update notification settings'
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsEnabling(false)
    }
  }

  const getStatusInfo = () => {
    if (!isSupported) {
      return {
        icon: AlertCircle,
        text: "Not supported in this browser",
        color: "text-gray-500"
      }
    }

    if ((permission as string) === 'denied') {
      return {
        icon: BellOff,
        text: "Blocked - enable in browser settings",
        color: "text-red-500"
      }
    }

    if (permission === 'default') {
      return {
        icon: Bell,
        text: "Click to enable notifications",
        color: "text-blue-500"
      }
    }

    if (isSubscribed) {
      return {
        icon: CheckCircle,
        text: "Notifications enabled",
        color: "text-green-500"
      }
    }

    return {
      icon: BellOff,
      text: "Notifications disabled",
      color: "text-gray-500"
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Switch
          checked={isSubscribed}
          onCheckedChange={handleToggleNotifications}
          disabled={!isSupported || isLoading || isEnabling || (permission as string) === 'denied'}
        />
        <div className="flex items-center gap-1">
          <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
          <span className="text-sm text-muted-foreground">
            {isLoading || isEnabling ? 'Updating...' : statusInfo.text}
          </span>
        </div>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Receive instant notifications for important announcements and updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            <span className="text-sm font-medium">{statusInfo.text}</span>
          </div>
          <Button
            onClick={handleToggleNotifications}
            disabled={!isSupported || isLoading || isEnabling}
            variant={isSubscribed ? "destructive" : "default"}
          >
            {isLoading || isEnabling ? 'Updating...' :
             isSubscribed ? 'Disable' : 'Enable'}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!isSupported && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Push notifications are not supported in this browser. Try using a modern browser like Chrome, Firefox, or Edge.
            </AlertDescription>
          </Alert>
        )}

        {(permission as string) === 'denied' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Notifications are blocked. Please enable them in your browser settings and refresh the page.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}