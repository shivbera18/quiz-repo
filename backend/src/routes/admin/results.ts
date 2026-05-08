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

    const results = await prisma.quizResult.findMany({
      orderBy: { date: "desc" },
      take: 100,
    })

    const totalAttempts = results.length
    const scoreDistribution = {
      excellent: results.filter(r => r.totalScore >= 80).length,
      good: results.filter(r => r.totalScore >= 60 && r.totalScore < 80).length,
      average: results.filter(r => r.totalScore >= 40 && r.totalScore < 60).length,
      poor: results.filter(r => r.totalScore < 40).length,
    }

    const dailyStats: Record<string, number> = {}
    for (const result of results) {
      const dateKey = result.date.toISOString().split("T")[0]
      dailyStats[dateKey] = (dailyStats[dateKey] || 0) + 1
    }

    res.json({
      totalAttempts,
      scoreDistribution,
      dailyStats,
      recentResults: results.slice(0, 10),
    })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.delete("/", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    await prisma.quizResult.deleteMany({})
    res.json({ message: "All results deleted" })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.delete("/:id", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const { id } = req.params
    await prisma.quizResult.delete({ where: { id } })
    res.json({ message: "Result deleted" })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router