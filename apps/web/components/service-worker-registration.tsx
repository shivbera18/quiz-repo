"use client"

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

// Owns the service worker LIFECYCLE only (single registration point for the
// whole app -- the install-prompt UI lives in pwa-handler.tsx and must not
// register again). When a new worker finishes installing in the background,
// shows a user-gated refresh banner instead of the old window.confirm():
// the waiting worker is activated via a SKIP_WAITING message ONLY when the
// user opts in, so caches never swap under a live session.
export default function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // A worker may already be waiting when this component mounts (e.g. the
      // update shipped while the tab was closed).
      if (registration.waiting && navigator.serviceWorker.controller) {
        setWaitingWorker(registration.waiting)
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker)
          }
        })
      })
    }).catch((error) => {
      console.error('Service worker registration failed:', error)
    })

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SW_ACTIVATED') setWaitingWorker(null)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [])

  const applyUpdate = () => {
    if (!waitingWorker) return
    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    // Reload once the new worker has claimed the page.
    navigator.serviceWorker.ready.then(() => window.location.reload())
  }

  if (!waitingWorker) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 rounded-lg border-2 border-black dark:border-white/65 bg-white dark:bg-gray-800 shadow-lg p-4 flex items-center justify-between gap-3">
      <span className="text-sm font-semibold">A new version is available.</span>
      <Button size="sm" className="font-bold" onClick={applyUpdate}>
        <RefreshCw className="h-4 w-4 mr-1" /> Refresh
      </Button>
    </div>
  )
}
