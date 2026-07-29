import type Redis from "ioredis"
import { keys } from "./keys.js"

// Approximate sliding window via two weighted fixed-window counters, in one
// Lua script -- see ARCHITECTURE.md's rate-limiting section for why this was
// picked over a sliding-window log (exact but O(requests) memory) or a token
// bucket (smoother, but its continuous state makes "why did I get a 429"
// genuinely hard to debug alone). This is what Cloudflare ships.
const SLIDING_WINDOW_LUA = `
local prev_key = KEYS[1]
local curr_key = KEYS[2]
local limit = tonumber(ARGV[1])
local window_ms = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local elapsed_in_curr = now % window_ms
local weight = elapsed_in_curr / window_ms

local prev_count = tonumber(redis.call("GET", prev_key) or "0")
local curr_count = tonumber(redis.call("GET", curr_key) or "0")

local estimated = (prev_count * (1 - weight)) + curr_count

if estimated >= limit then
  return { 0, math.floor(estimated), limit }
end

curr_count = redis.call("INCR", curr_key)
if curr_count == 1 then
  redis.call("PEXPIRE", curr_key, window_ms * 2)
end

return { 1, math.floor(estimated) + 1, limit }
`

export interface RateLimitPolicy {
  name: string
  limit: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  limit: number
}

export async function checkRateLimit(
  redis: Redis,
  policy: RateLimitPolicy,
  subject: string
): Promise<RateLimitResult> {
  const now = Date.now()
  const currentWindow = Math.floor(now / policy.windowMs)
  const prevWindow = currentWindow - 1

  const currKey = keys.rateLimit(policy.name, subject, currentWindow)
  const prevKey = keys.rateLimit(policy.name, subject, prevWindow)

  const [allowed, used, limit] = (await redis.eval(
    SLIDING_WINDOW_LUA,
    2,
    prevKey,
    currKey,
    policy.limit,
    policy.windowMs,
    now
  )) as [number, number, number]

  return { allowed: allowed === 1, remaining: Math.max(0, limit - used), limit }
}

// Policies from ARCHITECTURE.md's rate-limiting table. Enforced at the
// gateway; ai-gen and export are re-checked inside their own services too
// (defence in depth -- anything that bypasses the gateway bypasses the limit).
export const RATE_LIMIT_POLICIES = {
  loginByIp: { name: "login:ip", limit: 10, windowMs: 5 * 60_000 },
  loginByEmail: { name: "login:email", limit: 5, windowMs: 15 * 60_000 },
  signupByIp: { name: "signup:ip", limit: 3, windowMs: 60 * 60_000 },
  aiGenByUser: { name: "ai-gen:user", limit: 5, windowMs: 60 * 60_000 },
  exportByUser: { name: "export:user", limit: 3, windowMs: 60 * 60_000 },
  answersByAttempt: { name: "answers:attempt", limit: 120, windowMs: 60_000 },
  submitByAttempt: { name: "submit:attempt", limit: 5, windowMs: 60_000 },
  defaultByUser: { name: "default:user", limit: 300, windowMs: 60_000 },
  defaultByIp: { name: "default:ip", limit: 600, windowMs: 60_000 },
} satisfies Record<string, RateLimitPolicy>
