// analytics-svc's core process: consumes every fact/dimension topic in the
// system and maintains the read models in prisma/schema.prisma. Every table
// here is derived and 100% rebuildable -- resetting this consumer group's
// offset to 0 and truncating the tables reproduces identical numbers, which
// is the actual point of putting dimensions on compacted topics (see
// ARCHITECTURE.md's "Data ownership").
//
// Idempotency: runConsumer() checks ProcessedEvent.hasProcessed(eventId)
// before calling onMessage, but the row that PROVES an event was applied is
// written by each handler below, inside the SAME transaction as the
// projection upsert it guards. That combination -- not just the pre-check --
// is what makes replay safe (a crash between the pre-check and the upsert
// would otherwise silently double-apply on redelivery).
import { PrismaClient, Prisma } from "./generated/prisma/index.js"
import { createLogger, ensureDatabaseUrl } from "@quiz/observability"
import { createKafka, runConsumer, TOPICS, isKafkaDisabled } from "@quiz/kafka-kit"
import { getRedisClient } from "@quiz/redis-kit"
import { recordLeaderboardEntry } from "@quiz/redis-kit"
import { keys } from "@quiz/redis-kit"
import type {
  AttemptSubmittedData,
  AttemptStartedData,
  QuizChangedData,
  ChapterChangedData,
  SubjectChangedData,
  UserChangedData,
  UserErasureRequestedData,
} from "@quiz/contracts"

const logger = createLogger("analytics-rollup-consumer")
ensureDatabaseUrl("analytics")
const prisma = new PrismaClient()
const redis = getRedisClient()
const CONSUMER_GROUP = "analytics-rollup-consumer"

function truncateToDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((truncateToDate(a).getTime() - truncateToDate(b).getTime()) / 86_400_000)
}

const processedEventStore = {
  async hasProcessed(eventId: string): Promise<boolean> {
    const row = await prisma.processedEvent.findUnique({ where: { eventId } })
    return row !== null
  },
}

// Records the event as processed inside the caller's transaction, throwing
// P2002 (unique violation) if two racing deliveries both got past the
// pre-check -- the transaction that loses the race rolls its whole
// projection update back rather than double-applying it.
async function markProcessed(tx: Prisma.TransactionClient, eventId: string) {
  await tx.processedEvent.create({ data: { eventId, consumerGroup: CONSUMER_GROUP } })
}

// ---- Late-dimension repair -------------------------------------------------
//
// Attempt facts are written the moment an attempt lands, resolving
// chapter/subject from whatever DimQuiz knew AT THAT MOMENT. When the
// quiz-changed/chapter-changed event arrives later (or the quiz was created
// through a path that used to skip the event entirely -- see catalog AI
// worker), every fact for it froze with chapterId/subjectId = null and was
// silently excluded from subject rollups, subject leaderboards, and
// subject-filtered exports. The helpers below repair exactly those frozen
// rows once the missing dimension resolves.
//
// Scope guard: only NULL-subject facts are ever touched -- facts that
// recorded a (now-stale) subject because their quiz later moved chapters are
// historical denormalization like everything else here, not repair targets.

interface RepairedFact {
  attemptId: string
  userId: string
  quizId: string
  submittedDate: Date
  totalScore: number
  timeSpentMs: number
}

const MAX_LEADERBOARD_REPAIRS_PER_EVENT = 1000

/**
 * Must run INSIDE the projection transaction, after the dimension row(s)
 * have been upserted. Repairs by primary-key list (not by re-matching the
 * where-clause) so facts inserted concurrently between the SELECT and the
 * UPDATE stay untouched and simply wait for the next dimension event --
 * otherwise they would be updated without being counted into the daily
 * bucket deltas below.
 *
 * Bucket scope: a submission whose subject was unknown only ever wrote the
 * {quiz,__all__} and {__all__,__all__} DailyRollup buckets; the
 * {__all__,subject} bucket was skipped. Repairs therefore apply that one
 * missing bucket per affected day. uniqueUsers stays at 0 for these
 * retroactive deltas (the exact first-seen tracker cannot be reconstructed
 * retroactively without risking inflation); attempts/score/time are exact.
 */
async function repairMissingSubjectForQuizzes(
  tx: Prisma.TransactionClient,
  quizIds: string[],
  subjectId: string,
  chapterId: string | null
): Promise<RepairedFact[]> {
  if (!subjectId || quizIds.length === 0) return []

  const facts = await tx.attemptFact.findMany({
    where: { quizId: { in: quizIds }, subjectId: null },
    select: { attemptId: true, userId: true, quizId: true, submittedDate: true, totalScore: true, timeSpentMs: true },
  })
  if (facts.length === 0) return []

  await tx.attemptFact.updateMany({
    where: { attemptId: { in: facts.map((f) => f.attemptId) } },
    data: { chapterId, subjectId },
  })
  await tx.attemptSectionFact.updateMany({
    where: { attemptId: { in: facts.map((f) => f.attemptId) } },
    data: { subjectId },
  })

  const byDate = new Map<string, { date: Date; attempts: number; sumScore: number; sumTimeMs: bigint }>()
  for (const fact of facts) {
    const key = fact.submittedDate.toISOString()
    const agg = byDate.get(key) ?? { date: fact.submittedDate, attempts: 0, sumScore: 0, sumTimeMs: BigInt(0) }
    agg.attempts += 1
    agg.sumScore += fact.totalScore
    agg.sumTimeMs += BigInt(fact.timeSpentMs)
    byDate.set(key, agg)
  }
  for (const agg of byDate.values()) {
    await upsertDailyRollupDeltas(tx, agg.date, [{ quizId: "__all__", subjectId }], {
      attempts: agg.attempts,
      uniqueUsers: 0,
      sumScore: agg.sumScore,
      sumTimeMs: agg.sumTimeMs,
    })
  }

  return facts
}

/**
 * Best-effort, POST-commit (like the normal submission path): re-record
 * leaderboard entries for repaired facts now that their subject is known.
 * ZADD GT semantics make this idempotent under redelivery. Failures are
 * swallowed -- the projection transaction has already committed and must not
 * be rolled back or crashed over a Redis hiccup.
 */
async function recordLeaderboardRepairs(repairedFacts: RepairedFact[], subjectId: string, quizIdsForCache: string[]) {
  if (repairedFacts.length === 0) return
  try {
    if (repairedFacts.length > MAX_LEADERBOARD_REPAIRS_PER_EVENT) {
      logger.warn(
        { repaired: repairedFacts.length, cappedAt: MAX_LEADERBOARD_REPAIRS_PER_EVENT },
        "leaderboard repair capped for this event"
      )
    }
    const userIds = [...new Set(repairedFacts.map((f) => f.userId))]
    const users = await prisma.dimUser.findMany({ where: { userId: { in: userIds } }, select: { userId: true, name: true } })
    const nameById = new Map(users.map((u) => [u.userId, u.name]))

    for (const fact of repairedFacts.slice(0, MAX_LEADERBOARD_REPAIRS_PER_EVENT)) {
      await recordLeaderboardEntry(redis, {
        userId: fact.userId,
        userName: nameById.get(fact.userId) ?? "[unknown]",
        quizId: fact.quizId,
        subjectId,
        totalScorePct: fact.totalScore,
        timeSpentSec: Math.round(fact.timeSpentMs / 1000),
      })
    }
    await redis.del(keys.cacheAnalyticsOverview(), ...quizIdsForCache.map((q) => keys.cacheAnalyticsQuiz(q)))
  } catch (err) {
    logger.warn({ err, repaired: repairedFacts.length }, "post-commit leaderboard repair failed (non-fatal)")
  }
}

async function upsertDailyRollupDeltas(
  tx: Prisma.TransactionClient,
  bucketDate: Date,
  buckets: Array<{ quizId: string; subjectId: string }>,
  delta: { attempts: number; uniqueUsers: number; sumScore: number; sumTimeMs: bigint }
) {
  for (const { quizId, subjectId } of buckets) {
    await tx.dailyRollup.upsert({
      where: { bucketDate_quizId_subjectId: { bucketDate, quizId, subjectId } },
      update: {
        attempts: { increment: delta.attempts },
        uniqueUsers: { increment: delta.uniqueUsers },
        sumScore: { increment: delta.sumScore },
        sumTimeMs: { increment: delta.sumTimeMs },
      },
      create: {
        bucketDate,
        quizId,
        subjectId,
        attempts: delta.attempts,
        uniqueUsers: delta.uniqueUsers,
        sumScore: delta.sumScore,
        sumTimeMs: delta.sumTimeMs,
      },
    })
  }
}

async function handleAttemptSubmitted(data: AttemptSubmittedData, eventId: string) {
  const submittedAt = new Date(data.submittedAt)
  const submittedDate = truncateToDate(submittedAt)

  // assessment-svc doesn't know chapter/subject (that's catalog-svc's
  // ownership, and embedding it would mean assessment-svc calling catalog on
  // every submit). Resolve it here from our own DimQuiz projection instead --
  // event-carried state transfer, not a cross-service call. Falls back to
  // null if quiz-changed hasn't been consumed yet (eventual consistency, not
  // a correctness bug: the fact row itself is still recorded either way).
  const dimQuiz = await prisma.dimQuiz.findUnique({ where: { quizId: data.quizId } })
  const chapterId = dimQuiz?.chapterId ?? null
  const subjectId = dimQuiz?.subjectId ?? null

  await prisma.$transaction(async (tx) => {
    await markProcessed(tx, eventId)

    await tx.attemptFact.upsert({
      where: { attemptId: data.attemptId },
      update: {},
      create: {
        attemptId: data.attemptId,
        userId: data.userId,
        quizId: data.quizId,
        chapterId,
        subjectId,
        submittedAt,
        submittedDate,
        totalScore: data.totalScore,
        rawScore: data.rawScore,
        maxScore: data.maxScore,
        correctCount: data.correctCount,
        wrongCount: data.wrongCount,
        unansweredCount: data.unansweredCount,
        timeSpentMs: data.timeSpentMs,
        submitSource: data.submitSource,
        scoringVersion: data.scoringVersion,
      },
    })

    for (const s of data.sectionScores) {
      await tx.attemptSectionFact.upsert({
        where: { attemptId_section: { attemptId: data.attemptId, section: s.section } },
        update: {},
        create: {
          attemptId: data.attemptId,
          section: s.section,
          userId: data.userId,
          quizId: data.quizId,
          subjectId,
          submittedAt,
          correct: s.correct,
          wrong: s.wrong,
          unanswered: s.unanswered,
          total: s.total,
          scorePct: s.scorePct,
          timeSpentMs: s.timeSpentMs,
        },
      })
    }

    // Per-question difficulty stats -- only present when the payload wasn't
    // claim-checked out (see QuestionOutcome's outcomesRef note in contracts).
    if (data.questionOutcomes) {
      for (const qo of data.questionOutcomes) {
        const optionKey = qo.selectedOption === null ? "unanswered" : String(qo.selectedOption)
        const existing = await tx.questionStat.findUnique({ where: { quizId_questionId: { quizId: data.quizId, questionId: qo.questionId } } })
        const optionCounts = (existing?.optionCounts as Record<string, number> | undefined) ?? {}
        optionCounts[optionKey] = (optionCounts[optionKey] ?? 0) + 1
        await tx.questionStat.upsert({
          where: { quizId_questionId: { quizId: data.quizId, questionId: qo.questionId } },
          update: {
            attempts: { increment: 1 },
            correct: { increment: qo.isCorrect ? 1 : 0 },
            wrong: { increment: !qo.isCorrect && qo.selectedOption !== null ? 1 : 0 },
            unanswered: { increment: qo.selectedOption === null ? 1 : 0 },
            sumTimeMs: { increment: BigInt(qo.timeSpentMs) },
            optionCounts,
          },
          create: {
            quizId: data.quizId,
            questionId: qo.questionId,
            section: qo.section,
            attempts: 1,
            correct: qo.isCorrect ? 1 : 0,
            wrong: !qo.isCorrect && qo.selectedOption !== null ? 1 : 0,
            unanswered: qo.selectedOption === null ? 1 : 0,
            sumTimeMs: BigInt(qo.timeSpentMs),
            optionCounts,
          },
        })
      }
    }

    // Exact unique_users via INSERT ... ON CONFLICT DO NOTHING -- only
    // increment quiz_stats.uniqueUsers when the insert actually happened.
    const seenResult = await tx.$executeRaw`
      INSERT INTO "QuizUserSeen" ("quizId", "userId") VALUES (${data.quizId}, ${data.userId})
      ON CONFLICT DO NOTHING
    `
    const isNewUserForQuiz = seenResult > 0

    const quizStats = await tx.quizStats.findUnique({ where: { quizId: data.quizId } })
    const newQuizAttempts = (quizStats?.attempts ?? 0) + 1
    const newQuizSumScore = (quizStats?.sumScore ?? 0) + data.totalScore
    await tx.quizStats.upsert({
      where: { quizId: data.quizId },
      update: {
        attempts: { increment: 1 },
        uniqueUsers: { increment: isNewUserForQuiz ? 1 : 0 },
        sumScore: { increment: data.totalScore },
        sumTimeMs: { increment: BigInt(data.timeSpentMs) },
        avgScore: newQuizSumScore / newQuizAttempts,
        avgTimeMs: Math.round((Number(quizStats?.sumTimeMs ?? 0n) + data.timeSpentMs) / newQuizAttempts),
        bestScore: Math.max(quizStats?.bestScore ?? 0, data.totalScore),
        passCount: { increment: data.totalScore >= 40 ? 1 : 0 },
      },
      create: {
        quizId: data.quizId,
        attempts: 1,
        uniqueUsers: 1,
        sumScore: data.totalScore,
        sumTimeMs: BigInt(data.timeSpentMs),
        avgScore: data.totalScore,
        avgTimeMs: data.timeSpentMs,
        bestScore: data.totalScore,
        passCount: data.totalScore >= 40 ? 1 : 0,
      },
    })

    const userStats = await tx.userStats.findUnique({ where: { userId: data.userId } })
    const newUserAttempts = (userStats?.attempts ?? 0) + 1
    const newUserSumScore = (userStats?.sumScore ?? 0) + data.totalScore
    const last20 = [...(userStats?.last20Scores ?? []), data.totalScore].slice(-20)

    let currentStreak = userStats?.currentStreakDays ?? 0
    if (userStats?.lastActiveDate) {
      const gap = daysBetween(submittedDate, userStats.lastActiveDate)
      if (gap === 1) currentStreak += 1
      else if (gap > 1) currentStreak = 1
      // gap === 0 (same day): streak unchanged
    } else {
      currentStreak = 1
    }
    const longestStreak = Math.max(userStats?.longestStreakDays ?? 0, currentStreak)

    await tx.userStats.upsert({
      where: { userId: data.userId },
      update: {
        attempts: { increment: 1 },
        lastAttemptAt: submittedAt,
        sumScore: { increment: data.totalScore },
        sumTimeMs: { increment: BigInt(data.timeSpentMs) },
        bestScore: Math.max(userStats?.bestScore ?? 0, data.totalScore),
        avgScore: newUserSumScore / newUserAttempts,
        last20Scores: last20,
        last20Avg: last20.reduce((a, b) => a + b, 0) / last20.length,
        currentStreakDays: currentStreak,
        longestStreakDays: longestStreak,
        lastActiveDate: submittedDate,
      },
      create: {
        userId: data.userId,
        attempts: 1,
        firstAttemptAt: submittedAt,
        lastAttemptAt: submittedAt,
        sumScore: data.totalScore,
        sumTimeMs: BigInt(data.timeSpentMs),
        bestScore: data.totalScore,
        avgScore: data.totalScore,
        last20Scores: last20,
        last20Avg: last20.reduce((a, b) => a + b, 0) / last20.length,
        currentStreakDays: 1,
        longestStreakDays: 1,
        lastActiveDate: submittedDate,
      },
    })

    const existingDaily = await tx.userDailyActivity.findUnique({
      where: { userId_activityDate: { userId: data.userId, activityDate: submittedDate } },
    })

    await tx.userDailyActivity.upsert({
      where: { userId_activityDate: { userId: data.userId, activityDate: submittedDate } },
      update: {
        attempts: { increment: 1 },
        sumTimeMs: { increment: BigInt(data.timeSpentMs) },
        bestScore: Math.max(existingDaily?.bestScore ?? 0, data.totalScore),
      },
      create: { userId: data.userId, activityDate: submittedDate, attempts: 1, sumTimeMs: BigInt(data.timeSpentMs), bestScore: data.totalScore },
    })

    const rollupBuckets = [
      { quizId: data.quizId, subjectId: "__all__" },
      ...(subjectId ? [{ quizId: "__all__", subjectId }] : []),
      { quizId: "__all__", subjectId: "__all__" },
    ]

    await upsertDailyRollupDeltas(
      tx,
      submittedDate,
      rollupBuckets,
      { attempts: 1, uniqueUsers: isNewUserForQuiz ? 1 : 0, sumScore: data.totalScore, sumTimeMs: BigInt(data.timeSpentMs) }
    )
  })

  // Best-effort, outside the transaction: Redis is a projection of a
  // projection here, not the system of record for any of this.
  try {
    await recordLeaderboardEntry(redis, {
      userId: data.userId,
      userName: data.userName,
      quizId: data.quizId,
      subjectId: subjectId ?? undefined,
      totalScorePct: data.totalScore,
      timeSpentSec: Math.round(data.timeSpentMs / 1000),
    })
  } catch (err) {
    logger.warn({ err, attemptId: data.attemptId }, "leaderboard write failed (non-fatal)")
  }
  try {
    await redis.del(keys.cacheAnalyticsQuiz(data.quizId), keys.cacheAnalyticsUser(data.userId), keys.cacheAnalyticsOverview())
  } catch {}
}

async function handleQuizChanged(data: QuizChangedData, eventId: string) {
  let subjectId = data.subjectId
  if (!subjectId && data.chapterId) {
    const chapter = await prisma.dimChapter.findUnique({ where: { chapterId: data.chapterId } })
    subjectId = chapter?.subjectId ?? null
  }
  let repairedFacts: RepairedFact[] = []
  await prisma.$transaction(async (tx) => {
    await markProcessed(tx, eventId)
    await tx.dimQuiz.upsert({
      where: { quizId: data.quizId },
      update: {
        quizVersion: data.quizVersion,
        title: data.title,
        chapterId: data.chapterId,
        subjectId,
        questionCount: data.questionCount,
        sectionNames: data.sectionNames,
        isActive: data.isActive,
        updatedAt: new Date(data.updatedAt),
      },
      create: {
        quizId: data.quizId,
        quizVersion: data.quizVersion,
        title: data.title,
        chapterId: data.chapterId,
        subjectId,
        questionCount: data.questionCount,
        sectionNames: data.sectionNames,
        isActive: data.isActive,
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
      },
    })
    // The dimension just resolved (or moved) -- repair any attempt facts that
    // froze with a null subject while this quiz was unknown to us.
    repairedFacts = subjectId ? await repairMissingSubjectForQuizzes(tx, [data.quizId], subjectId, data.chapterId) : []
  })
  await recordLeaderboardRepairs(repairedFacts, subjectId ?? "", [data.quizId])
  await redis.del(keys.cacheAnalyticsQuiz(data.quizId), keys.cacheAnalyticsOverview())
}

async function handleChapterChanged(data: ChapterChangedData, eventId: string) {
  let repairedFacts: RepairedFact[] = []
  await prisma.$transaction(async (tx) => {
    await markProcessed(tx, eventId)
    await tx.dimChapter.upsert({
      where: { chapterId: data.chapterId },
      update: { subjectId: data.subjectId, name: data.name },
      create: { chapterId: data.chapterId, subjectId: data.subjectId, name: data.name },
    })
    // quiz-changed can arrive before chapter-changed (no cross-topic
    // ordering guarantee) -- re-resolve any DimQuiz rows left with a stale
    // or missing subjectId for this chapter.
    await tx.dimQuiz.updateMany({ where: { chapterId: data.chapterId }, data: { subjectId: data.subjectId } })
    // Same story one level down: attempt facts recorded while the chapter
    // (or its quizzes' subject chain) was unknown are repaired here.
    const chapterQuizzes = await tx.dimQuiz.findMany({ where: { chapterId: data.chapterId }, select: { quizId: true } })
    repairedFacts = await repairMissingSubjectForQuizzes(
      tx,
      chapterQuizzes.map((q) => q.quizId),
      data.subjectId,
      data.chapterId
    )
  })
  await recordLeaderboardRepairs(repairedFacts, data.subjectId, [])
}

async function handleSubjectChanged(data: SubjectChangedData, eventId: string) {
  await prisma.$transaction(async (tx) => {
    await markProcessed(tx, eventId)
    await tx.dimSubject.upsert({
      where: { subjectId: data.subjectId },
      update: { name: data.name },
      create: { subjectId: data.subjectId, name: data.name },
    })
  })
}

async function handleUserChanged(data: UserChangedData, eventId: string) {
  await prisma.$transaction(async (tx) => {
    await markProcessed(tx, eventId)
    await tx.dimUser.upsert({
      where: { userId: data.userId },
      update: {
        name: data.name,
        email: data.email,
        userType: data.userType,
        isAdmin: data.isAdmin,
        updatedAt: new Date(data.updatedAt),
        deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
      },
      create: {
        userId: data.userId,
        name: data.name,
        email: data.email,
        userType: data.userType,
        isAdmin: data.isAdmin,
        registeredAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        deletedAt: data.deletedAt ? new Date(data.deletedAt) : null,
      },
    })
  })
  await redis.del(keys.cacheAnalyticsUser(data.userId))
}

async function handleUserErasureRequested(data: UserErasureRequestedData, eventId: string) {
  // AttemptFact/AttemptSectionFact deliberately keep historical userId as a
  // soft reference and are NOT redacted here -- see ARCHITECTURE.md's
  // "deliberate historical denormalization" note (a result sheet from before
  // an erasure request should still show as many attempts as existed; only
  // the identity dimension, which is current-state, gets scrubbed).
  await prisma.$transaction(async (tx) => {
    await markProcessed(tx, eventId)
    await tx.dimUser.updateMany({
      where: { userId: data.userId },
      data: { name: "[erased]", email: "[erased]", deletedAt: new Date() },
    })
  })
}

// A single per-quiz "started but hasn't been seen since" abandonment metric
// would need to reconcile against attempt-submitted (and account for
// still-in-progress attempts that haven't expired yet), which is real
// bookkeeping this pass didn't have time for -- ARCHITECTURE.md's own
// cut-list names attempt-started.v1 as the first thing to drop under time
// pressure, precisely because it feeds only this one metric. Consumed here
// only so the topic's offset advances and its processed_event bookkeeping
// stays consistent with every other topic; no rollup table is written.
async function handleAttemptStarted(_data: AttemptStartedData, eventId: string) {
  await prisma.$transaction(async (tx) => {
    await markProcessed(tx, eventId)
  })
}

async function main() {
  if (isKafkaDisabled()) {
    logger.warn("Kafka disabled - analytics-rollup-consumer idle (no events will be processed)")
    await new Promise(() => {})
    return
  }
  const kafka = createKafka("analytics-rollup-consumer")

  await runConsumer<
    | AttemptSubmittedData
    | AttemptStartedData
    | QuizChangedData
    | ChapterChangedData
    | SubjectChangedData
    | UserChangedData
    | UserErasureRequestedData
  >(kafka, {
    groupId: CONSUMER_GROUP,
    topics: [
      TOPICS.ATTEMPT_SUBMITTED,
      TOPICS.ATTEMPT_STARTED,
      TOPICS.QUIZ_CHANGED,
      TOPICS.CHAPTER_CHANGED,
      TOPICS.SUBJECT_CHANGED,
      TOPICS.USER_CHANGED,
      TOPICS.USER_ERASURE_REQUESTED,
    ],
    store: processedEventStore,
    async onMessage({ envelope }) {
      switch (envelope.eventType) {
        case TOPICS.ATTEMPT_SUBMITTED:
          return handleAttemptSubmitted(envelope.data as AttemptSubmittedData, envelope.eventId)
        case TOPICS.ATTEMPT_STARTED:
          return handleAttemptStarted(envelope.data as AttemptStartedData, envelope.eventId)
        case TOPICS.QUIZ_CHANGED:
          return handleQuizChanged(envelope.data as QuizChangedData, envelope.eventId)
        case TOPICS.CHAPTER_CHANGED:
          return handleChapterChanged(envelope.data as ChapterChangedData, envelope.eventId)
        case TOPICS.SUBJECT_CHANGED:
          return handleSubjectChanged(envelope.data as SubjectChangedData, envelope.eventId)
        case TOPICS.USER_CHANGED:
          return handleUserChanged(envelope.data as UserChangedData, envelope.eventId)
        case TOPICS.USER_ERASURE_REQUESTED:
          return handleUserErasureRequested(envelope.data as UserErasureRequestedData, envelope.eventId)
        default:
          logger.warn({ eventType: envelope.eventType }, "unhandled event type")
      }
    },
    // Catalog emits tombstones (null payload keyed by entity id) when an
    // admin deletes a subject/chapter/quiz. Without this the dimension rows
    // survived forever, so deleted quizzes kept appearing in admin analytics
    // dropdowns and result listings. Facts are deliberately NOT deleted here:
    // historical attempts stay attributable (the same denormalization policy
    // as user erasure), they just lose their dimension join and render as
    // "Unknown Quiz".
    async onTombstone({ topic, key }) {
      if (!key) {
        logger.warn({ topic }, "tombstone without key ignored")
        return
      }
      switch (topic) {
        case TOPICS.QUIZ_CHANGED: {
          const deleted = await prisma.dimQuiz.deleteMany({ where: { quizId: key } })
          try { await redis.del(keys.cacheAnalyticsQuiz(key), keys.cacheAnalyticsOverview()) } catch {}
          logger.info({ quizId: key, deleted: deleted.count }, "quiz dimension removed via tombstone")
          return
        }
        case TOPICS.CHAPTER_CHANGED: {
          const deleted = await prisma.dimChapter.deleteMany({ where: { chapterId: key } })
          try { await redis.del(keys.cacheAnalyticsOverview()) } catch {}
          logger.info({ chapterId: key, deleted: deleted.count }, "chapter dimension removed via tombstone")
          return
        }
        case TOPICS.SUBJECT_CHANGED: {
          const deleted = await prisma.dimSubject.deleteMany({ where: { subjectId: key } })
          try { await redis.del(keys.cacheAnalyticsOverview()) } catch {}
          logger.info({ subjectId: key, deleted: deleted.count }, "subject dimension removed via tombstone")
          return
        }
        default:
          logger.warn({ topic }, "tombstone on unexpected topic ignored")
      }
    },
  })

  logger.info("analytics-rollup-consumer running")
}

main().catch((err) => {
  logger.error(err, "analytics-rollup-consumer failed to start")
  process.exit(1)
})
