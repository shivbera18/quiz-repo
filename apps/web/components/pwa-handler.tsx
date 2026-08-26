"use client"

import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Download, X } from 'lucide-react'

// Owns the INSTALL experience only: captures beforeinstallprompt, renders
// the Android/Chrome install button, iOS add-to-home-screen instructions,
// and the appinstalled cleanup. Service worker REGISTRATION and updates
// live in service-worker-registration.tsx -- do not register here.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAHandler() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  // Tracks whether we are running as an installed PWA so the banner never
  // shows inside its own window (display-mode check covers Android/desktop;
  // iOS Safari standalone reports via navigator.standalone).
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in window.navigator && Boolean((window.navigator as any).standalone))
    )
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && Boolean((window.navigator as any).standalone))
    ) {
      setIsInstalled(true)
      return
    }

    if (localStorage.getItem('pwa-install-dismissed') === 'true') return

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
      localStorage.removeItem('pwa-install-dismissed')
    }

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (isIOS) setShowInstallPrompt(true)

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') localStorage.removeItem('pwa-install-dismissed')
    setDeferredPrompt(null)
    setShowInstallPrompt(false)
  }

  const handleDismiss = () => {
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }

  if (isInstalled || isStandalone || !showInstallPrompt) return null

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  const shell = (children: React.ReactNode) => (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-lg border-2 border-black dark:border-white/65 bg-white dark:bg-gray-800 shadow-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">{children}</div>
        <Button variant="ghost" size="sm" onClick={handleDismiss} aria-label="Dismiss install prompt">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )

  if (isIOS) {
    return shell(
      <>
        <h3 className="font-semibold text-sm">Install Quiz App</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Tap the Share button and choose &quot;Add to Home Screen&quot;.
        </p>
      </>
    )
  }

  return shell(
    <>
      <h3 className="font-semibold text-sm">Install Quiz App</h3>
      <p className="text-xs text-muted-foreground mt-1">Full-screen app with offline access.</p>
      <Button size="sm" className="mt-2 font-bold" onClick={handleInstallClick}>
        <Download className="h-4 w-4 mr-1" /> Install
      </Button>
    </>
  )
}
