import type Redis from "ioredis"
import { keys } from "./keys.js"

// Composite integer score so ties break by speed, without a secondary sort:
//   score = round(totalScore * 100) * 1e6 + (999_999 - min(timeSpentSec, 999_999))
// Max ~1.0e13, comfortably inside float64's exact-integer range (2^53 ~= 9.0e15).
export function encodeLeaderboardScore(totalScorePct: number, timeSpentSec: number): number {
  const scorePart = Math.round(totalScorePct * 100) * 1_000_000
  const timePart = 999_999 - Math.min(timeSpentSec, 999_999)
  return scorePart + timePart
}

export function decodeLeaderboardScore(score: number): { scorePct: number; timeSpentSec: number } {
  const scorePart = Math.floor(score / 1_000_000)
  const timePart = score % 1_000_000
  return { scorePct: scorePart / 100, timeSpentSec: 999_999 - timePart }
}

export function isoWeek(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`
}

// `GT` (Redis >=6.2, supported by Upstash) means a worse retry can never lower
// an existing entry -- that flag alone *is* the "best attempt counts" rule, no
// read-then-write and no race. See ARCHITECTURE.md's leaderboards section.
export async function recordLeaderboardEntry(
  redis: Redis,
  params: { userId: string; userName: string; quizId: string; subjectId?: string; totalScorePct: number; timeSpentSec: number }
) {
  const score = encodeLeaderboardScore(params.totalScorePct, params.timeSpentSec)
  const pipeline = redis.pipeline()
  pipeline.call("ZADD", keys.leaderboardQuiz(params.quizId), "GT", "CH", score, params.userId)
  pipeline.call("ZADD", keys.leaderboardGlobal(), "GT", "CH", score, params.userId)
  pipeline.call("ZADD", keys.leaderboardWeekly(isoWeek(new Date())), "GT", "CH", score, params.userId)
  if (params.subjectId) {
    pipeline.call("ZADD", keys.leaderboardSubject(params.subjectId), "GT", "CH", score, params.userId)
  }
  pipeline.hset(keys.leaderboardNames(), params.userId, params.userName)
  // Weekly rotation is implicit in the key itself -- no cron, no RENAME. 9 days
  // covers "this week" plus a grace window for a "last week's winners" panel.
  pipeline.expire(keys.leaderboardWeekly(isoWeek(new Date())), 9 * 86_400)
  await pipeline.exec()
}

export async function getLeaderboard(redis: Redis, key: string, limit = 10) {
  const raw = await redis.zrevrange(key, 0, limit - 1, "WITHSCORES")
  const names = await redis.hgetall(keys.leaderboardNames())
  const entries: Array<{ userId: string; userName: string; rank: number; scorePct: number; timeSpentSec: number }> = []
  for (let i = 0; i < raw.length; i += 2) {
    const userId = raw[i]
    const score = Number(raw[i + 1])
    const { scorePct, timeSpentSec } = decodeLeaderboardScore(score)
    entries.push({ userId, userName: names[userId] ?? "Unknown", rank: i / 2 + 1, scorePct, timeSpentSec })
  }
  return entries
}
