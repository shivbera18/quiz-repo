// Read-mostly routes over the legacy (pre-Attempt) QuizResult table --
// assessment-svc kept that model specifically for this ("the historical
// data it already holds"; see schema.prisma). New submissions never write
// here (they go through the Attempt flow in attempt-service.ts); this is
// purely about not breaking the handful of admin/self reporting pages that
// still read it, since it holds every score recorded before this service
// split. The cross-service enrichment (quiz title/chapter/subject, user
// name/email) that used to be one Prisma include chain is now two internal
// HTTP calls -- see legacy-client.ts.
import type { FastifyInstance } from "fastify"
import type { PrismaClient } from "./generated/prisma/index.js"
import { requireUser, requireAdmin, getUser } from "./auth.js"
import { fetchAllUsers, fetchQuizMeta, fetchUserById, type LegacyQuizMeta } from "./legacy-client.js"
import { fetchFullQuiz } from "./catalog-client.js"

function parseJsonSafe<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function registerLegacyRoutes(app: FastifyInstance, prisma: PrismaClient) {
  // ------------------------------------------------------- personal history
  app.get("/v1/legacy-results", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return

    const results = await prisma.quizResult.findMany({ where: { userId: user.userId }, orderBy: { date: "desc" } })
    const quizMeta = await fetchQuizMeta().catch(() => new Map<string, LegacyQuizMeta>())

    const transformed = results.map((r) => {
      const sections = parseJsonSafe<{ reasoning: number; quantitative: number; english: number }>(r.sections, {
        reasoning: 0,
        quantitative: 0,
        english: 0,
      })
      const answers = parseJsonSafe<any[]>(r.answers, [])
      return {
        _id: r.id,
        date: r.date.toISOString(),
        quizName: quizMeta.get(r.quizId)?.title ?? "Unknown Quiz",
        quizId: r.quizId,
        totalScore: r.totalScore,
        rawScore: r.totalScore,
        positiveMarks: sections.reasoning + sections.quantitative + sections.english,
        negativeMarks: 0,
        correctAnswers: answers.filter((a) => a.isCorrect === true).length,
        wrongAnswers: answers.filter((a) => a.isCorrect === false && !a.isUnanswered && a.userAnswer !== null && a.userAnswer !== undefined).length,
        unanswered: answers.filter((a) => a.isUnanswered === true || a.userAnswer === null || a.userAnswer === undefined).length,
        sections,
        questions: [],
        answers,
        timeSpent: r.timeSpent,
        negativeMarking: true,
        negativeMarkValue: 0.25,
        userId: r.userId,
      }
    })

    return { results: transformed, success: true, timestamp: new Date().toISOString(), count: transformed.length }
  })

  app.get("/v1/legacy-results/:id", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return
    const { id } = request.params as { id: string }

    const result = await prisma.quizResult.findFirst({ where: user.isAdmin ? { id } : { id, userId: user.userId } })
    if (!result) {
      reply.code(404)
      return { message: "Result not found" }
    }

    const quiz = await fetchFullQuiz(result.quizId).catch(() => null)
    const explanations = new Map<string, string>()
    const options = new Map<string, string[]>()
    for (const q of quiz?.questions ?? []) {
      if (q.explanation) explanations.set(q.id, q.explanation)
      if (q.options) options.set(q.id, q.options)
    }

    let answers = parseJsonSafe<any[]>(result.answers, [])
    answers = answers.map((a) => ({
      ...a,
      explanation: a.explanation ?? (a.questionId ? explanations.get(a.questionId) : undefined),
      options: a.options ?? (a.questionId ? options.get(a.questionId) : undefined),
    }))
    const sections = parseJsonSafe<Record<string, any>>(result.sections, {})

    return {
      result: {
        _id: result.id,
        date: result.date.toISOString(),
        quizName: quiz?.title ?? "Unknown Quiz",
        quizId: result.quizId,
        totalScore: result.totalScore,
        rawScore: sections.rawScore ?? result.totalScore,
        positiveMarks: sections.positiveMarks ?? 0,
        negativeMarks: sections.negativeMarks ?? 0,
        correctAnswers: sections.correctAnswers ?? 0,
        wrongAnswers: sections.wrongAnswers ?? 0,
        unanswered: sections.unanswered ?? 0,
        sections: { reasoning: sections.reasoning ?? 0, quantitative: sections.quantitative ?? 0, english: sections.english ?? 0 },
        questions: answers,
        timeSpent: result.timeSpent,
        negativeMarking: sections.negativeMarking ?? true,
        negativeMarkValue: sections.negativeMarkValue ?? 0.25,
        userId: result.userId,
      },
    }
  })

  // --------------------------------------------------------- self analytics
  app.get("/v1/legacy-analytics", async (request, reply) => {
    const user = requireUser(request, reply)
    if (!user) return

    const results = await prisma.quizResult.findMany({ where: { userId: user.userId }, orderBy: { date: "desc" } })
    const quizMeta = await fetchQuizMeta().catch(() => new Map<string, LegacyQuizMeta>())

    const transformed = results.map((r) => {
      const sections = parseJsonSafe<{ reasoning: number; quantitative: number; english: number }>(r.sections, {
        reasoning: 0,
        quantitative: 0,
        english: 0,
      })
      const answers = parseJsonSafe<any[]>(r.answers, [])
      const meta = quizMeta.get(r.quizId)
      return {
        _id: r.id,
        id: r.id,
        date: r.date.toISOString(),
        quizName: meta?.title ?? "Unknown Quiz",
        quizId: r.quizId,
        totalScore: r.totalScore,
        rawScore: r.totalScore,
        positiveMarks: sections.reasoning + sections.quantitative + sections.english,
        negativeMarks: Math.max(0, sections.reasoning + sections.quantitative + sections.english - r.totalScore),
        correctAnswers: answers.filter((a) => a.isCorrect === true).length,
        wrongAnswers: answers.filter((a) => a.isCorrect === false && !a.isUnanswered && a.userAnswer !== null && a.userAnswer !== undefined).length,
        unanswered: answers.filter((a) => a.isUnanswered === true || a.userAnswer === null || a.userAnswer === undefined).length,
        sections,
        questions: [] as unknown[],
        answers,
        timeSpent: r.timeSpent,
        negativeMarking: true,
        negativeMarkValue: 0.25,
        userId: r.userId,
        userName: r.userName,
        userEmail: r.userEmail,
        user: { id: r.userId, name: r.userName, email: r.userEmail },
        quiz: meta ? { id: meta.id, title: meta.title } : null,
        subject: meta?.subjectName ?? "Unknown Subject",
        chapter: meta?.chapterName ?? "Unknown Chapter",
        subjectIcon: meta?.subjectIcon ?? "📚",
        subjectColor: meta?.subjectColor ?? "#3B82F6",
      }
    })

    const totalAttempts = transformed.length
    const averageScore = totalAttempts > 0 ? Math.round(transformed.reduce((s, r) => s + r.totalScore, 0) / totalAttempts) : 0
    const bestScore = totalAttempts > 0 ? Math.max(...transformed.map((r) => r.totalScore)) : 0
    const recentAttempts = transformed.slice(0, 10)

    const subjectStats: Record<string, any> = {}
    for (const r of transformed) {
      subjectStats[r.subject] ??= { subject: r.subject, attempts: 0, totalScore: 0, bestScore: 0, icon: r.subjectIcon, color: r.subjectColor }
      subjectStats[r.subject].attempts++
      subjectStats[r.subject].totalScore += r.totalScore
      subjectStats[r.subject].bestScore = Math.max(subjectStats[r.subject].bestScore, r.totalScore)
    }
    const subjectStatsArray = Object.values(subjectStats).map((s: any) => ({ ...s, averageScore: Math.round(s.totalScore / s.attempts) }))

    const chapterStats: Record<string, any> = {}
    for (const r of transformed) {
      const key = `${r.subject} - ${r.chapter}`
      chapterStats[key] ??= { subject: r.subject, chapter: r.chapter, attempts: 0, totalScore: 0, bestScore: 0 }
      chapterStats[key].attempts++
      chapterStats[key].totalScore += r.totalScore
      chapterStats[key].bestScore = Math.max(chapterStats[key].bestScore, r.totalScore)
    }
    const chapterStatsArray = Object.values(chapterStats).map((s: any) => ({ ...s, averageScore: Math.round(s.totalScore / s.attempts) }))

    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000)
    const recentResults = transformed.filter((r) => new Date(r.date) >= thirtyDaysAgo).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    reply.header("Cache-Control", "no-cache, no-store, must-revalidate")
    return {
      success: true,
      results: transformed,
      analytics: {
        totalAttempts,
        averageScore,
        bestScore,
        recentAttempts,
        subjectStats: subjectStatsArray,
        chapterStats: chapterStatsArray,
        performanceTrend: recentResults.map((r) => ({ date: r.date, score: r.totalScore, quizName: r.quizName })),
      },
      timestamp: new Date().toISOString(),
      userId: user.userId,
    }
  })

  // -------------------------------------------------------------- admin
  app.get("/v1/admin/legacy-analytics", async (request, reply) => {
    if (!requireAdmin(request, reply)) return

    const results = await prisma.quizResult.findMany({ orderBy: { date: "desc" } })
    const quizMeta = await fetchQuizMeta().catch(() => new Map<string, LegacyQuizMeta>())
    const quizList = Array.from(quizMeta.values())

    const totalUsers = new Set(results.map((r) => r.userEmail)).size
    const totalQuizzes = quizList.length
    const activeQuizzes = quizList.filter((q) => q.isActive).length
    const totalAttempts = results.length
    const averageScore = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.totalScore, 0) / results.length) : 0
    const averageTime = results.length > 0 ? Math.round(results.reduce((s, r) => s + (r.timeSpent || 0), 0) / results.length) : 0
    const totalQuestions = quizList.reduce((total, q) => total + q.questionCount, 0)

    const processedResults = results.map((r) => {
      const sections = parseJsonSafe(r.sections, { reasoning: 0, quantitative: 0, english: 0 })
      const answers = parseJsonSafe<any[]>(r.answers, [])
      let correctAnswers = 0
      let wrongAnswers = 0
      let unanswered = 0
      for (const a of answers) {
        if (a.selectedAnswer === null || a.selectedAnswer === undefined) unanswered++
        else if (a.isCorrect) correctAnswers++
        else wrongAnswers++
      }
      const meta = quizMeta.get(r.quizId)
      return {
        ...r,
        correctAnswers,
        wrongAnswers,
        unanswered,
        _id: r.id,
        sections,
        quiz: meta ? { id: meta.id, title: meta.title } : null,
        user: { id: r.userId, name: r.userName || "Anonymous", email: r.userEmail },
      }
    })

    const recentActivity = processedResults.slice(0, 20).map((r) => ({
      id: r.id,
      userEmail: r.userEmail,
      userName: r.userName || "Anonymous",
      quizTitle: r.quiz?.title || "Unknown Quiz",
      score: r.totalScore,
      timeSpent: r.timeSpent,
      date: r.date,
    }))

    return {
      success: true,
      timestamp: new Date().toISOString(),
      totalUsers,
      totalQuizzes,
      activeQuizzes,
      totalAttempts,
      totalQuestions,
      averageScore,
      averageTime,
      recentActivity,
      results: processedResults,
      quizzes: quizList.map((q) => ({ id: q.id, title: q.title, questionCount: q.questionCount, isActive: q.isActive, createdAt: q.createdAt })),
    }
  })

  app.delete("/v1/admin/legacy-results", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { id, userId, quizId } = request.query as { id?: string; userId?: string; quizId?: string }

    if (id) {
      const existing = await prisma.quizResult.findUnique({ where: { id } })
      if (!existing) {
        reply.code(404)
        return { message: "Result not found" }
      }
      const deleted = await prisma.quizResult.delete({ where: { id } })
      return { message: "Quiz result deleted successfully", deletedId: deleted.id }
    }
    if (userId && quizId) {
      const result = await prisma.quizResult.deleteMany({ where: { userId, quizId } })
      return { message: "User quiz results deleted successfully", deletedCount: result.count }
    }
    if (userId) {
      const result = await prisma.quizResult.deleteMany({ where: { userId } })
      return { message: "All user results deleted successfully", deletedCount: result.count }
    }
    if (quizId) {
      const result = await prisma.quizResult.deleteMany({ where: { quizId } })
      return { message: "All quiz results deleted successfully", deletedCount: result.count }
    }
    reply.code(400)
    return { message: "Missing required parameters" }
  })

  app.get("/v1/admin/legacy-users", async (request, reply) => {
    if (!requireAdmin(request, reply)) return

    const [users, results] = await Promise.all([fetchAllUsers(), prisma.quizResult.findMany()])
    const usersWithStats = users.map((u) => {
      const userResults = results.filter((r) => r.userId === u.id)
      const totalAttempts = userResults.length
      const averageScore = totalAttempts > 0 ? Math.round(userResults.reduce((s, r) => s + r.totalScore, 0) / totalAttempts) : 0
      const bestScore = totalAttempts > 0 ? Math.max(...userResults.map((r) => r.totalScore)) : 0
      const lastActive = userResults.length > 0 ? userResults[userResults.length - 1].date : u.lastLogin
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        userType: u.userType,
        isAdmin: u.isAdmin,
        joinDate: u.createdAt,
        lastActive,
        totalAttempts,
        averageScore,
        bestScore,
      }
    })

    return { users: usersWithStats }
  })

  app.get("/v1/admin/legacy-user-performance", async (request, reply) => {
    if (!requireAdmin(request, reply)) return
    const { userId } = request.query as { userId?: string }
    if (!userId) {
      reply.code(400)
      return { message: "User ID required" }
    }

    const [user, results, quizMeta] = await Promise.all([
      fetchUserById(userId),
      prisma.quizResult.findMany({ where: { userId }, orderBy: { date: "desc" } }),
      fetchQuizMeta().catch(() => new Map<string, LegacyQuizMeta>()),
    ])
    if (!user) {
      reply.code(404)
      return { message: "User not found" }
    }

    const quizPerformance: Record<string, any> = {}
    for (const r of results) {
      const quizTitle = quizMeta.get(r.quizId)?.title ?? "Unknown Quiz"
      quizPerformance[r.quizId] ??= { quizId: r.quizId, quizTitle, attempts: [], bestScore: 0, averageScore: 0, totalAttempts: 0, averageTime: 0 }
      const answers = parseJsonSafe<any[]>(r.answers, [])
      quizPerformance[r.quizId].attempts.push({
        id: r.id,
        date: r.date,
        totalScore: r.totalScore,
        correctAnswers: answers.filter((a) => a.isCorrect === true).length,
        wrongAnswers: answers.filter((a) => a.isCorrect === false && a.userAnswer !== null && a.userAnswer !== undefined).length,
        unanswered: answers.filter((a) => a.isUnanswered === true || a.userAnswer === null || a.userAnswer === undefined).length,
        timeSpent: r.timeSpent,
        sections: r.sections,
      })
      quizPerformance[r.quizId].totalAttempts++
      quizPerformance[r.quizId].bestScore = Math.max(quizPerformance[r.quizId].bestScore, r.totalScore)
    }
    for (const quiz of Object.values(quizPerformance) as any[]) {
      const totalScore = quiz.attempts.reduce((s: number, a: any) => s + a.totalScore, 0)
      const totalTime = quiz.attempts.reduce((s: number, a: any) => s + (a.timeSpent || 0), 0)
      quiz.averageScore = Math.round(totalScore / quiz.totalAttempts)
      quiz.averageTime = Math.round(totalTime / quiz.totalAttempts)
    }

    const totalAttempts = results.length
    const averageScore = totalAttempts > 0 ? Math.round(results.reduce((s, r) => s + r.totalScore, 0) / totalAttempts) : 0

    return {
      user: { id: user.id, name: user.name, email: user.email, totalQuizzes: totalAttempts, averageScore },
      quizPerformance: Object.values(quizPerformance),
    }
  })
}
