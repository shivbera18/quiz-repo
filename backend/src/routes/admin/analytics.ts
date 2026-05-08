import { Router } from "express"
import { prisma } from "../../db.js"

const router = Router()

function getTokenFromHeader(req: import("express").Request): string | null {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null
  }
  return authHeader.substring(7)
}

function validateToken(token: string | null): boolean {
  return !!token && token.length >= 10
}

router.get("/", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const totalQuizzes = await prisma.quiz.count()
    const activeQuizzes = await prisma.quiz.count({ where: { isActive: true } })
    const totalUsers = await prisma.user.count()
    const totalResults = await prisma.quizResult.count()
    const totalSubjects = await prisma.subject.count()
    const totalChapters = await prisma.chapter.count()
    const totalQuestions = await prisma.questionBankItem.count()

    const recentResults = await prisma.quizResult.findMany({
      orderBy: { date: "desc" },
      take: 10,
    })

    const avgScore = recentResults.length > 0
      ? Math.round(recentResults.reduce((sum, r) => sum + r.totalScore, 0) / recentResults.length)
      : 0

    res.json({
      totalQuizzes,
      activeQuizzes,
      totalUsers,
      totalResults,
      totalSubjects,
      totalChapters,
      totalQuestions,
      averageScore: avgScore,
      recentResults,
    })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router