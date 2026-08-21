---
name: pwa-service-worker
description: Master skill for PWA web manifest, service worker caching, offline HTML fallback, VAPID push registration, push event handlers, and update rollouts in apps/web. Trigger whenever editing apps/web/public/sw.js, modifying app/manifest.ts, adjusting components/service-worker-registration.tsx, updating hooks/use-push-notifications.tsx, or debugging offline/PWA installability behavior.
---

# PWA & Service Worker Management

`apps/web` provides Progressive Web App (PWA) capabilities including offline fallback, asset caching, service worker lifecycle management, and web push delivery.

## Key Files & Structure

- **Service Worker Script:** `apps/web/public/sw.js`.
- **Web App Manifest:** `apps/web/app/manifest.ts`.
- **SW Registration Component:** `apps/web/components/service-worker-registration.tsx`.
- **PWA Install & Update Handler:** `apps/web/components/pwa-handler.tsx`.
- **Push Notification Hook:** `apps/web/hooks/use-push-notifications.tsx`.
- **Offline Fallback Page:** `apps/web/public/offline.html`.

## Service Worker Lifecycle (`public/sw.js`)

1. **Install & Cache Pre-fetching:**
   - Pre-caches core assets (`/offline.html`, icons, fallback styles).
   - Calls `self.skipWaiting()` on install.
2. **Fetch Interception & Offline Fallback:**
   - Dynamic API requests (`/api/*`, `/v1/*`) use **Network-First** strategy.
   - Static assets use **Cache-First** strategy.
   - When HTML navigation fails due to network outage, returns pre-cached `/offline.html`.
3. **Push Event Handler (`push` event):**
   - Parses push notification JSON payload: `{ title, body, icon, tag, url, priority }`.
   - Notification options:
     - `icon`: `/icons/icon-192x192.svg` (default).
     - `badge`: `/icons/icon-192x192.svg`.
     - `data`: `{ url: payload.url || "/dashboard" }`.
     - `requireInteraction`: Set to `true` if `priority === "urgent"` or `"high"`.
4. **Notification Click Handler (`notificationclick` event):**
   - Closes notification banner.
   - Calls `clients.matchAll({ type: "window" })`. Focuses existing tab if open to target URL; otherwise calls `clients.openWindow(url)`.

## Push Subscription Registration (`use-push-notifications.tsx`)

1. **VAPID Key Conversion:** Reads `process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY` and converts URL-safe base64 string to `Uint8Array`.
2. **Subscribe:**
   ```ts
   const registration = await navigator.serviceWorker.ready;
   const subscription = await registration.pushManager.subscribe({
     userVisibleOnly: true,
     applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
   });
   ```
3. **Persist to Backend:** Sends subscription payload (`endpoint`, `keys: { p256dh, auth }`) to `POST /api/push-subscription` (proxied to gateway `/v1/push-subscriptions`).
4. **Unsubscribe:** Calls `subscription.unsubscribe()` and sends `DELETE /api/push-subscription?endpoint=...`.

## Verification Checklist

```bash
pnpm --filter web typecheck
pnpm --filter web build
```

- Verify `sw.js` correctly serves `/offline.html` when offline.
- Verify `push` event handles missing optional fields (`priority`, `url`) without throwing uncaught exceptions.
- Verify `use-push-notifications.tsx` converts VAPID keys using `urlBase64ToUint8Array`.
