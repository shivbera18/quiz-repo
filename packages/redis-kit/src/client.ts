import Redis from "ioredis"
import { InMemoryRedis } from "./memory.js"

let sharedClient: Redis | null = null
let warned = false

function isRedisDisabled(url: string): boolean {
  if (process.env.DISABLE_REDIS === "true") return true
  if (!url || url === "disabled" || url === "memory://") return true
  return false
}

function createInMemoryClient(): Redis {
  if (!warned) {
    console.warn("[redis-kit] Using in-memory Redis mock (DISABLE_REDIS=true or no REDIS_URL). Caching, rate limiting, leaderboards and SSE are in-memory only.")
    warned = true
  }
  return new InMemoryRedis() as unknown as Redis
}

export function getRedisClient(url = process.env.REDIS_URL || "redis://localhost:6380"): Redis {
  if (isRedisDisabled(url)) {
    if (!sharedClient) sharedClient = createInMemoryClient()
    return sharedClient
  }
  if (!sharedClient) {
    try {
      sharedClient = new Redis(url, {
        maxRetriesPerRequest: 3,
        lazyConnect: false,
        // Fail fast for local dev without Redis: don't retry forever
        retryStrategy(times) {
          if (times > 3) return null
          return Math.min(times * 200, 1000)
        },
      })
      // If connection fails, fall back to memory on next call
      sharedClient.on("error", (err) => {
        if (!warned && isRedisDisabled(process.env.REDIS_URL || "")) return
        // Only warn once and keep trying; for Docker-free dev we want immediate fallback
        if (process.env.FALLBACK_REDIS_MEMORY === "true" && !warned) {
          console.warn("[redis-kit] Redis connection error, consider DISABLE_REDIS=true for local dev without Redis:", err.message)
        }
      })
    } catch {
      sharedClient = createInMemoryClient()
    }
  }
  return sharedClient
}

// Explicit helper for local dev: force in-memory regardless of env
export function getInMemoryRedisClient(): Redis {
  return createInMemoryClient()
}
