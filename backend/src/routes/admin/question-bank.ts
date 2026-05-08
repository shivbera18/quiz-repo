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

    const questions = await prisma.questionBankItem.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        chapter: true,
      },
    })

    const parsedQuestions = questions.map(q => {
      let optionsArr: string[] = []
      let tagsArr: string[] = []
      try {
        if (typeof q.options === "string") {
          optionsArr = JSON.parse(q.options)
        }
        if (typeof q.tags === "string") {
          tagsArr = JSON.parse(q.tags)
        }
      } catch {}

      return {
        ...q,
        options: optionsArr,
        tags: tagsArr,
      }
    })

    res.json(parsedQuestions)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.post("/", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const { section, question, options, correctAnswer, explanation, difficulty, tags, image, source, chapterId, createdBy } = req.body

    const newQuestion = await prisma.questionBankItem.create({
      data: {
        section,
        question,
        options: JSON.stringify(options),
        correctAnswer,
        explanation: explanation || "",
        difficulty: difficulty || "medium",
        tags: JSON.stringify(tags || []),
        image: image || "",
        source: source || "",
        chapterId,
        createdBy: createdBy || "admin",
      },
    })

    res.status(201).json(newQuestion)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.put("/:id", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const { id } = req.params
    const { section, question, options, correctAnswer, explanation, difficulty, tags, image, source, isVerified, chapterId } = req.body

    const updateData: any = {}
    if (section !== undefined) updateData.section = section
    if (question !== undefined) updateData.question = question
    if (options !== undefined) updateData.options = JSON.stringify(options)
    if (correctAnswer !== undefined) updateData.correctAnswer = correctAnswer
    if (explanation !== undefined) updateData.explanation = explanation
    if (difficulty !== undefined) updateData.difficulty = difficulty
    if (tags !== undefined) updateData.tags = JSON.stringify(tags)
    if (image !== undefined) updateData.image = image
    if (source !== undefined) updateData.source = source
    if (isVerified !== undefined) updateData.isVerified = isVerified
    if (chapterId !== undefined) updateData.chapterId = chapterId

    const updated = await prisma.questionBankItem.update({
      where: { id },
      data: updateData,
    })

    res.json(updated)
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
    await prisma.questionBankItem.delete({ where: { id } })
    res.json({ message: "Question deleted" })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router