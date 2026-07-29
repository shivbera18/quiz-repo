import type { FastifyReply } from "fastify"
import type Redis from "ioredis"
import { checkRateLimit, RATE_LIMIT_POLICIES, type RateLimitPolicy } from "@quiz/redis-kit"

// Enforced here (the gateway is the only place ALL traffic passes through);
// ai-gen and export are documented in ARCHITECTURE.md as also worth
// re-checking inside their own services as defence in depth, since anything
// that reaches a service directly (e.g. server-to-server on the Docker
// network) bypasses this. Not duplicated there in this pass.
export async function enforceRateLimit(redis: Redis, reply: FastifyReply, policy: RateLimitPolicy, subject: string): Promise<boolean> {
  const result = await checkRateLimit(redis, policy, subject)
  reply.header("X-RateLimit-Limit", result.limit)
  reply.header("X-RateLimit-Remaining", result.remaining)
  if (!result.allowed) {
    reply.code(429).send({ message: "Too many requests" })
    return false
  }
  return true
}

export { RATE_LIMIT_POLICIES }
