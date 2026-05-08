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

    const subjects = await prisma.subject.findMany({
      include: {
        chapters: {
          include: {
            quizzes: true,
          },
        },
      },
    })

    const data = subjects.map(subject => ({
      id: subject.id,
      name: subject.name,
      chapters: subject.chapters.map(chapter => ({
        id: chapter.id,
        name: chapter.name,
        quizCount: chapter.quizzes.length,
      })),
    }))

    res.json(data)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router