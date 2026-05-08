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

    const users = await prisma.user.findMany({
      orderBy: { totalQuizzes: "desc" },
      take: 50,
    })

    const userPerformance = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      totalQuizzes: user.totalQuizzes || 0,
      averageScore: user.averageScore || 0,
      lastLogin: user.lastLogin,
    }))

    res.json(userPerformance)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router