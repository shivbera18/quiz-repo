---
name: pwa-service-worker
description: Change or debug the web app manifest, service-worker registration, caching, offline behavior, update rollout, installability, icons, and push notification handlers.
---

# PWA and Service Worker

Make service-worker changes without trapping users on stale application code or caching private API data.

## Entry points

- Manifest: `apps/web/app/manifest.ts`.
- Registration: `apps/web/components/service-worker-registration.tsx`.
- PWA lifecycle: `apps/web/components/pwa-handler.tsx`.
- Worker: `apps/web/public/sw.js`.
- Offline page: `apps/web/public/offline.html`.
- Icons: `apps/web/app/icon.tsx`, `apple-icon.tsx`, and `public/`.
- Push UI/hooks: `push-notifications-manager.tsx` and `use-push-notifications.tsx`.

## Caching rules

- Version cache names and remove obsolete caches during activation.
- Precache only stable public shell assets that exist at build/runtime.
- Do not cache authenticated API responses, tokens, user profiles, quiz attempts, answers, results, admin pages, SSE, or mutation responses.
- Prefer network-first for navigations with offline fallback; use cache-first only for immutable/static assets.
- Restrict handling to same-origin requests unless cross-origin caching is explicitly designed.
- Never cache failed/non-OK responses unintentionally.
- Preserve query parameters when they affect content.

## Update lifecycle

1. Decide whether updates activate immediately or wait; handle `skipWaiting` and `clients.claim` consistently.
2. Avoid forcibly reloading repeatedly when a new worker takes control.
3. Communicate actionable update state through existing UI patterns without blocking quiz submission.
4. During an active quiz, prioritize preserving unsaved state before update/reload.

## Push behavior

Validate notification payload fields, use stable tags deliberately, focus an existing same-origin client before opening a new window, and constrain click URLs to safe same-origin paths.

## Verification

```bash
pnpm --filter web typecheck
pnpm --filter web build
```

Use a production build because service-worker behavior differs in development. In browser tooling verify installability, manifest/icon loading, offline navigation, cache contents, update activation, push click behavior, and that authenticated API responses are absent from Cache Storage.
