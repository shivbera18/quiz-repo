// The gateway never verifies the opaque token itself (that format/logic
// stays inside identity-svc, per the hard "keep the old auth" constraint for
// this project) -- it calls identity-svc's POST /v1/internal/introspect once
// per request (Redis-cached for a short TTL) and, on success, sets
// x-user-id/x-user-name/x-user-email/x-user-is-admin headers that every
// downstream service trusts. This is the ONE place that talks to
// /v1/internal/introspect; that route is never proxied to the browser.
import type Redis from "ioredis"
import { keys } from "@quiz/redis-kit"

const IDENTITY_SVC_URL = process.env.IDENTITY_SVC_URL || "http://localhost:4001"
const TOKEN_CACHE_TTL_SEC = 120

export interface IntrospectedUser {
  userId: string
  name: string
  email: string
  isAdmin: boolean
}

export async function introspectToken(redis: Redis, token: string): Promise<IntrospectedUser | null> {
  const cacheKey = keys.tokenCache(token)
  // Cache is best-effort: if Redis is unavailable (local dev without Docker)
  // we degrade to direct introspection without caching rather than failing.
  try {
    const cached = await redis.get(cacheKey)
    if (cached !== null) {
      return cached === "" ? null : JSON.parse(cached)
    }
  } catch {
    // Redis unavailable - fall through to direct fetch
  }

  const res = await fetch(`${IDENTITY_SVC_URL}/v1/internal/introspect`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token }),
  })

  if (!res.ok) {
    // identity-svc unreachable/erroring -- don't cache, so the next request
    // retries instead of pinning every caller to a 401 for the cache TTL.
    throw new Error(`identity-svc introspect returned ${res.status}`)
  }

  const body = (await res.json()) as { valid: boolean; userId?: string; name?: string; email?: string; isAdmin?: boolean }
  if (!body.valid || !body.userId) {
    try {
      await redis.set(cacheKey, "", "EX", TOKEN_CACHE_TTL_SEC)
    } catch {}
    return null
  }

  const user: IntrospectedUser = { userId: body.userId, name: body.name ?? "", email: body.email ?? "", isAdmin: body.isAdmin ?? false }
  try {
    await redis.set(cacheKey, JSON.stringify(user), "EX", TOKEN_CACHE_TTL_SEC)
  } catch {}
  return user
}
