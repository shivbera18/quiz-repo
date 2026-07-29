// SSE fan-out across instances via Redis pub/sub, per ARCHITECTURE.md's
// realtime section. A capped backlog list per user lets a reconnecting
// EventSource (which sends Last-Event-ID automatically) replay what it
// missed instead of silently losing it -- broadcast messages aren't
// backlogged (fanning a capped list write out to every user on every
// announcement would be its own bottleneck); a reconnect after a broadcast
// just picks up the next one.
import type Redis from "ioredis"
import { keys } from "@quiz/redis-kit"

const BACKLOG_MAX = 50

export interface SseEvent {
  id: string
  event: string
  data: unknown
}

function newEventId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export async function publishToUser(redis: Redis, userId: string, event: string, data: unknown): Promise<void> {
  const payload: SseEvent = { id: newEventId(), event, data }
  const serialized = JSON.stringify(payload)
  const pipeline = redis.pipeline()
  pipeline.rpush(keys.sseBacklog(userId), serialized)
  pipeline.ltrim(keys.sseBacklog(userId), -BACKLOG_MAX, -1)
  pipeline.expire(keys.sseBacklog(userId), 3600)
  pipeline.publish(keys.pubsubUser(userId), serialized)
  await pipeline.exec()
}

export async function publishBroadcast(redis: Redis, event: string, data: unknown): Promise<void> {
  const payload: SseEvent = { id: newEventId(), event, data }
  await redis.publish(keys.pubsubBroadcast(), JSON.stringify(payload))
}

export async function getBacklogSince(redis: Redis, userId: string, lastEventId: string | undefined): Promise<SseEvent[]> {
  if (!lastEventId) return []
  const raw = await redis.lrange(keys.sseBacklog(userId), 0, -1)
  const events: SseEvent[] = raw.map((r: string) => JSON.parse(r))
  const idx = events.findIndex((e) => e.id === lastEventId)
  return idx === -1 ? events : events.slice(idx + 1)
}
