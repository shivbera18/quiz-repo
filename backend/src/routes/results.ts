import { Router } from "express"
import { prisma } from "../db.js"

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
    })

    const parsedResults = results.map(result => {
      let sectionsArr: any[] = []
      if (typeof result.sections === "string") {
        try {
          sectionsArr = JSON.parse(result.sections)
        } catch {
          sectionsArr = []
        }
      } else if (Array.isArray(result.sections)) {
        sectionsArr = result.sections
      }

      let answersArr: any[] = []
      if (typeof result.answers === "string") {
        try {
          answersArr = JSON.parse(result.answers)
        } catch {
          answersArr = []
        }
      } else if (Array.isArray(result.answers)) {
        answersArr = result.answers
      }

      return {
        ...result,
        sections: sectionsArr,
        answers: answersArr,
      }
    })

    res.json(parsedResults)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.get("/recent", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const results = await prisma.quizResult.findMany({
      orderBy: { date: "desc" },
      take: 10,
    })

    res.json(results)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.get("/history", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const results = await prisma.quizResult.findMany({
      orderBy: { date: "desc" },
    })

    res.json(results)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const { id } = req.params
    const result = await prisma.quizResult.findUnique({ where: { id } })

    if (!result) {
      return res.status(404).json({ message: "Result not found" })
    }

    let sectionsArr: any[] = []
    if (typeof result.sections === "string") {
      try {
        sectionsArr = JSON.parse(result.sections)
      } catch {
        sectionsArr = []
      }
    } else if (Array.isArray(result.sections)) {
      sectionsArr = result.sections
    }

    let answersArr: any[] = []
    if (typeof result.answers === "string") {
      try {
        answersArr = JSON.parse(result.answers)
      } catch {
        answersArr = []
      }
    } else if (Array.isArray(result.answers)) {
      answersArr = result.answers
    }

    res.json({
      ...result,
      sections: sectionsArr,
      answers: answersArr,
    })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.post("/", async (req, res) => {
  try {
    const { quizId, userId, userName, userEmail, totalScore, sections, answers, timeSpent } = req.body

    if (!quizId || !userId || !userName || !userEmail || totalScore === undefined) {
      return res.status(400).json({ message: "Missing required fields" })
    }

    const newResult = await prisma.quizResult.create({
      data: {
        quizId,
        userId,
        userName,
        userEmail,
        totalScore,
        sections: JSON.stringify(sections || []),
        answers: JSON.stringify(answers || []),
        timeSpent: timeSpent || 0,
      },
    })

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (user) {
      const currentQuizzes = user.totalQuizzes || 0
      const currentAvg = user.averageScore || 0
      const newTotal = currentQuizzes + 1
      const newAvg = Math.round((currentAvg * currentQuizzes + totalScore) / newTotal)

      await prisma.user.update({
        where: { id: userId },
        data: {
          totalQuizzes: newTotal,
          averageScore: newAvg,
        },
      })
    }

    res.status(201).json(newResult)
  } catch (error) {
    console.error("Result creation error:", error)
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