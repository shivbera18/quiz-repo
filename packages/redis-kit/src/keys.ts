// Every Redis key in the system is built here and nowhere else -- one place a
// key pattern is defined, matching ARCHITECTURE.md's "typed builders" note.
// Prefix `q:` throughout; logical separation is by prefix, not DB index,
// since Upstash and Redis Cluster don't support SELECT.

export const keys = {
  // Auth: caches identity-svc's token validation result. Not a session store --
  // the opaque token itself remains the credential (old auth scheme, kept
  // as-is); this just saves a Postgres round trip on every request, which was
  // the actual latency win in the old nine-duplicated-validateToken design.
  tokenCache: (token: string) => `q:auth:token:${token}`,

  // In-flight attempt state (write-behind cache in front of assessment-svc's
  // Postgres AttemptAnswer table).
  attempt: (attemptId: string) => `q:att:${attemptId}`,
  attemptAnswers: (attemptId: string) => `q:att:${attemptId}:ans`,
  attemptResumeLookup: (userId: string, quizId: string) => `q:att:user:${userId}:${quizId}`,
  attemptDirtySet: () => `q:att:dirty`,

  // Leaderboards
  leaderboardQuiz: (quizId: string) => `q:lb:quiz:${quizId}`,
  leaderboardSubject: (subjectId: string) => `q:lb:subject:${subjectId}`,
  leaderboardGlobal: () => `q:lb:global`,
  leaderboardWeekly: (isoWeek: string) => `q:lb:weekly:${isoWeek}`,
  leaderboardNames: () => `q:lb:names`,

  // Analytics cache
  cacheAnalyticsOverview: () => `q:cache:analytics:overview`,
  cacheAnalyticsQuiz: (quizId: string) => `q:cache:analytics:quiz:${quizId}`,
  cacheAnalyticsUser: (userId: string) => `q:cache:analytics:user:${userId}`,
  cacheLock: (name: string) => `q:lock:${name}`,

  // Rate limiting
  rateLimit: (policy: string, subject: string, windowStart: number) => `q:rl:${policy}:${subject}:${windowStart}`,

  // Idempotency
  idempotency: (route: string, userId: string, key: string) => `q:idem:${route}:${userId}:${key}`,

  // SSE
  pubsubUser: (userId: string) => `q:pubsub:user:${userId}`,
  pubsubBroadcast: () => `q:pubsub:broadcast`,
  sseTicket: (ticket: string) => `q:sse:ticket:${ticket}`,
  sseBacklog: (userId: string) => `q:sse:backlog:${userId}`,

  // Sweeper best-effort lock
  sweeperLock: (shard: string | number) => `q:lock:sweeper:${shard}`,
}
