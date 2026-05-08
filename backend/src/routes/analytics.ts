import { Router } from "express"
import { prisma } from "../db.js"

const router = Router()

router.get("/", async (req, res) => {
  try {
    const results = await prisma.quizResult.findMany({
      orderBy: { date: "desc" },
    })

    const totalAttempts = results.length
    const totalScore = results.reduce((sum, r) => sum + r.totalScore, 0)
    const averageScore = totalAttempts > 0 ? Math.round(totalScore / totalAttempts) : 0

    const quizCount = await prisma.quiz.count({ where: { isActive: true } })
    const userCount = await prisma.user.count()

    res.json({
      totalAttempts,
      averageScore,
      quizCount,
      userCount,
      recentResults: results.slice(0, 10),
    })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router