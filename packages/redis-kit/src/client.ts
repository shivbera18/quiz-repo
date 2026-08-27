import Redis from "ioredis"

let sharedClient: Redis | null = null

export function getRedisClient(url = process.env.REDIS_URL || "redis://localhost:6380"): Redis {
  if (!sharedClient) {
    sharedClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    })
  }
  return sharedClient
}
