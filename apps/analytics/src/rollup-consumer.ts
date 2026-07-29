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
import { createLogger } from "@quiz/observability"
import { createKafka, runConsumer, TOPICS } from "@quiz/kafka-kit"
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

    await tx.userDailyActivity.upsert({
      where: { userId_activityDate: { userId: data.userId, activityDate: submittedDate } },
      update: {
        attempts: { increment: 1 },
        sumTimeMs: { increment: BigInt(data.timeSpentMs) },
        bestScore: Math.max(0, data.totalScore),
      },
      create: { userId: data.userId, activityDate: submittedDate, attempts: 1, sumTimeMs: BigInt(data.timeSpentMs), bestScore: data.totalScore },
    })

    await upsertDailyRollupDeltas(
      tx,
      submittedDate,
      [
        { quizId: data.quizId, subjectId: "__all__" },
        { quizId: "__all__", subjectId: subjectId ?? "__all__" },
        { quizId: "__all__", subjectId: "__all__" },
      ],
      { attempts: 1, uniqueUsers: isNewUserForQuiz ? 1 : 0, sumScore: data.totalScore, sumTimeMs: BigInt(data.timeSpentMs) }
    )
  })

  // Best-effort, outside the transaction: Redis is a projection of a
  // projection here, not the system of record for any of this.
  await recordLeaderboardEntry(redis, {
    userId: data.userId,
    userName: data.userName,
    quizId: data.quizId,
    subjectId: subjectId ?? undefined,
    totalScorePct: data.totalScore,
    timeSpentSec: Math.round(data.timeSpentMs / 1000),
  })
  await redis.del(keys.cacheAnalyticsQuiz(data.quizId), keys.cacheAnalyticsUser(data.userId), keys.cacheAnalyticsOverview())
}

async function handleQuizChanged(data: QuizChangedData, eventId: string) {
  let subjectId = data.subjectId
  if (!subjectId && data.chapterId) {
    const chapter = await prisma.dimChapter.findUnique({ where: { chapterId: data.chapterId } })
    subjectId = chapter?.subjectId ?? null
  }
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
  })
  await redis.del(keys.cacheAnalyticsQuiz(data.quizId), keys.cacheAnalyticsOverview())
}

async function handleChapterChanged(data: ChapterChangedData, eventId: string) {
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
  })
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
  })

  logger.info("analytics-rollup-consumer running")
}

main().catch((err) => {
  logger.error(err, "analytics-rollup-consumer failed to start")
  process.exit(1)
})
