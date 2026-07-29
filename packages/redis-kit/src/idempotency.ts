import type Redis from "ioredis"

// First request SET NX with a "pending" marker, then overwrites with the
// serialized 2xx response; a second concurrent request sees "pending" and
// should reply 409 IDEMPOTENT_REQUEST_IN_PROGRESS. Deliberately not used for
// attempt submit -- that's a Postgres compare-and-swap, since the database
// must be the arbiter of a student's score, not a Redis key.
export async function withIdempotency<T>(
  redis: Redis,
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<{ status: "ok"; result: T } | { status: "in_progress" } | { status: "replayed"; result: T }> {
  const requestId = Math.random().toString(36).slice(2)
  const set = await redis.set(key, `pending:${requestId}`, "EX", ttlSeconds, "NX")

  if (set !== "OK") {
    const existing = await redis.get(key)
    if (existing?.startsWith("pending:")) {
      return { status: "in_progress" }
    }
    return { status: "replayed", result: JSON.parse(existing ?? "null") }
  }

  const result = await fn()
  await redis.set(key, JSON.stringify(result), "EX", ttlSeconds)
  return { status: "ok", result }
}
