---
name: notifications-realtime-push
description: Build or debug announcements, SSE streaming, stream tickets, Web Push subscriptions, service-worker delivery, fanout, retries, and notification deduplication.
---

# Notifications, SSE, and Push

Maintain one announcement flow across API, Kafka, Redis, SSE, push delivery, and browser state.

## Entry points

- API: `apps/notification/src/index.ts`.
- Fanout worker: `apps/notification/src/fanout-worker.ts`.
- SSE: `apps/notification/src/sse.ts`.
- Web Push: `apps/notification/src/push.ts`.
- Notification outbox: `apps/notification/src/outbox-store.ts`.
- Frontend: `push-notifications-manager.tsx`, `use-push-notifications.tsx`, `service-worker-registration.tsx`, and `public/sw.js`.
- Compose process: notification API and fanout worker.

## Required behavior

- Announcement create/update/repush endpoints enforce admin authorization in notification-svc.
- Persist announcement and outbox event atomically.
- SSE uses a short-lived single-use ticket because browser `EventSource` cannot attach Authorization headers.
- Ticket issuance requires normal authentication; ticket consumption must validate expiry and prevent replay.
- Keep heartbeat, disconnect cleanup, reconnection, and proxy buffering behavior correct for SSE.
- Store push endpoints/keys as secrets and never log them.
- Fan out subscriptions in pages; do not synchronously send N pushes from the API request.
- Use `dedupeKey`/event processing to prevent duplicate delivery under Kafka replay.
- Disable or remove subscriptions on permanent Web Push responses such as 404/410.
- User erasure hard-deletes subscriptions and user reference data.

## Workflow

1. Trace announcement → outbox → fanout event → Redis SSE broadcast and paged push requests → web-push → service worker click/navigation.
2. Check both foreground and background notification behavior.
3. Handle permission states `default`, `granted`, and `denied` without repeatedly prompting.
4. Validate VAPID configuration and origin/service-worker scope without exposing private keys.
5. Test reconnect, ticket replay, duplicate event, repush, stale endpoint, partial fanout failure, unsubscribe, and user erasure.

## Verification

```bash
pnpm --filter notification-svc typecheck
pnpm --filter web typecheck
pnpm --filter @quiz/contracts typecheck
```

Browser push requires HTTPS or localhost and valid VAPID configuration. State when verification is limited to local SSE or mocked push.
