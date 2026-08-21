---
name: notifications-realtime-push
description: Master skill for announcements, web push notifications, two-stage event fanout, SSE event streaming, single-use stream tickets, and VAPID delivery. Trigger whenever modifying notification-svc, editing fanout-worker.ts, sse.ts, or push.ts, updating push subscription routes, or changing announcement publishing workflows.
---

# Notifications, Realtime SSE & Web Push

`apps/notification` (port 4005) handles browser announcements, real-time Server-Sent Events (SSE), and third-party Web Push notifications via VAPID. It is isolated from core services to prevent slow external push APIs (Apple/Google/Mozilla) from degrading HTTP endpoints.

## Entry Points & Structure

- **API Routes:** `apps/notification/src/index.ts`.
- **Fanout Worker:** `apps/notification/src/fanout-worker.ts` (`groupId: "notification-fanout-worker"`).
- **SSE Stream & Ticket Engine:** `apps/notification/src/sse.ts`.
- **Web Push Engine:** `apps/notification/src/push.ts`.
- **Prisma Models:** `apps/notification/prisma/schema.prisma` (`Announcement`, `AnnouncementRead`, `PushSubscription`, `UserRef`, `ProcessedEvent`, `Outbox`).

## Two-Stage Push Fanout Pattern

To avoid blocking request threads during mass delivery, push notifications use a strict two-stage asynchronous fanout:

```
POST /v1/admin/announcements ──▶ Insert Announcement + Outbox ANNOUNCEMENT_PUBLISHED (1 Tx)
                                                │
                                                ▼
Stage 1 Worker: ANNOUNCEMENT_PUBLISHED ──▶ 1. SSE Broadcast (Instant)
                                       ──▶ 2. Keyset Page Subscriptions (100/page)
                                       ──▶ 3. Emit batch PUSH_SEND_REQUESTED per sub
                                                │
                                                ▼
Stage 2 Worker: PUSH_SEND_REQUESTED    ──▶ sendPushToSubscription()
                                           (HTTP 410 -> set isActive: false)
```

1. **Stage 1 (`ANNOUNCEMENT_PUBLISHED`):**
   - Calls `publishBroadcast(redis, "announcement", ...)` to push immediately to all open SSE connections.
   - Keyset-pages `PushSubscription where isActive = true` (100 per page).
   - Emits one `PUSH_SEND_REQUESTED` event per subscription via `producer.sendBatch` (key = `userId`).
   - **Secret Protection Rule:** `PUSH_SEND_REQUESTED` payloads carry ONLY `subscriptionId` and `announcementId`. Secrets (`endpoint`, `p256dh`, `auth`) MUST NEVER be published to Kafka.
2. **Stage 2 (`PUSH_SEND_REQUESTED`):**
   - Fetches target subscription and executes `sendPushToSubscription()`.
   - **Handling HTTP 410 (Gone):** Expired browser subscriptions return 410 from push services. The worker marks `isActive: false` soft delete. This is treated as SUCCESS, not an error.

## SSE Stream Architecture & Ticket Auth (`/v1/stream`)

EventSource browser APIs cannot send `Authorization: Bearer` headers. Authentication uses single-use tickets:

1. **Mint Ticket (`POST /v1/stream/tickets`):** Authenticated user gets a 30s UUID ticket stored in Redis (`q:sse:ticket:<t>`).
2. **Connect Stream (`GET /v1/stream?ticket=...`):**
   - Gateway lists `/v1/stream` as public.
   - Endpoint validates and deletes ticket atomically using Redis **`GETDEL`** (single-use, unreplayable). Returns 401 if missing/invalid.
   - Calls `reply.hijack()` and sets `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`, `X-Accel-Buffering: no`.
   - 15s Heartbeat (`: ping\n\n`) keeps connection alive through load balancers.
   - Replays missed messages from `Last-Event-ID` header using Redis backlog ZSET (`q:sse:backlog:<userId>`, capped 50 messages, TTL 1 hour).
   - Duplicates Redis client and subscribes to `pubsubUser(userId)` and `pubsubBroadcast()`.
   - Cleans up subscribers on socket disconnect (`request.raw.on("close")`).

## User Erasure (`USER_ERASURE_REQUESTED`)

When identity-svc emits `USER_ERASURE_REQUESTED`, notification-svc HARD DELETES `PushSubscription` and `UserRef` records (unlike analytics' redact-only policy, because push endpoints are active push secrets).

## Verification Checklist

```bash
pnpm --filter notification-svc prisma:generate
pnpm --filter notification-svc typecheck
pnpm --filter @quiz/redis-kit typecheck
```

- Verify SSE connection returns 401 when re-using a consumed ticket (`GETDEL`).
- Verify HTTP 410 from web-push deactivates subscription without throwing uncaught errors.
- Verify `PUSH_SEND_REQUESTED` payloads do not contain `p256dh` or `auth` secrets.
