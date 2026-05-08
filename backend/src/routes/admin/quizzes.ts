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

    const quizzes = await prisma.quiz.findMany({
      orderBy: { createdAt: "desc" },
    })

    res.json(quizzes)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.get("/export-csv", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const quizzes = await prisma.quiz.findMany({
      orderBy: { createdAt: "desc" },
    })

    const csvRows = ["id,title,description,timeLimit,isActive,createdAt"]
    for (const quiz of quizzes) {
      csvRows.push(`"${quiz.id}","${quiz.title}","${quiz.description}",${quiz.timeLimit},${quiz.isActive},"${quiz.createdAt}"`)
    }

    res.setHeader("Content-Type", "text/csv")
    res.send(csvRows.join("\n"))
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
    const quiz = await prisma.quiz.findUnique({ where: { id } })

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" })
    }

    res.json(quiz)
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

    const { title, description, timeLimit, sections, questions, createdBy, startTime, endTime, negativeMarking, negativeMarkValue, chapterId } = req.body

    const newQuiz = await prisma.quiz.create({
      data: {
        title,
        description: description || "",
        timeLimit: timeLimit || 30,
        sections: JSON.stringify(sections || []),
        questions: JSON.stringify(questions || []),
        createdBy: createdBy || "admin",
        startTime: startTime ? new Date(startTime) : null,
        endTime: endTime ? new Date(endTime) : null,
        negativeMarking: negativeMarking ?? true,
        negativeMarkValue: negativeMarkValue ?? 0.25,
        chapterId,
      },
    })

    res.status(201).json(newQuiz)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.patch("/:id", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const { id } = req.params
    const { title, description, timeLimit, sections, questions, isActive, startTime, endTime, negativeMarking, negativeMarkValue, chapterId } = req.body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit
    if (sections !== undefined) updateData.sections = JSON.stringify(sections)
    if (questions !== undefined) updateData.questions = JSON.stringify(questions)
    if (isActive !== undefined) updateData.isActive = isActive
    if (startTime !== undefined) updateData.startTime = startTime ? new Date(startTime) : null
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null
    if (negativeMarking !== undefined) updateData.negativeMarking = negativeMarking
    if (negativeMarkValue !== undefined) updateData.negativeMarkValue = negativeMarkValue
    if (chapterId !== undefined) updateData.chapterId = chapterId

    const updatedQuiz = await prisma.quiz.update({
      where: { id },
      data: updateData,
    })

    res.json(updatedQuiz)
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
    await prisma.quiz.delete({ where: { id } })
    res.json({ message: "Quiz deleted" })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.get("/:id/questions", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const { id } = req.params
    const quiz = await prisma.quiz.findUnique({ where: { id } })

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" })
    }

    let questions = []
    if (typeof quiz.questions === "string") {
      try {
        questions = JSON.parse(quiz.questions)
      } catch {
        questions = []
      }
    }

    res.json(questions)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.post("/:id/questions", async (req, res) => {
  try {
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const { id } = req.params
    const { questions: newQuestions } = req.body

    const quiz = await prisma.quiz.findUnique({ where: { id } })
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" })
    }

    let existingQuestions = []
    if (typeof quiz.questions === "string") {
      try {
        existingQuestions = JSON.parse(quiz.questions)
      } catch {
        existingQuestions = []
      }
    }

    const allQuestions = [...existingQuestions, ...(newQuestions || [])]

    await prisma.quiz.update({
      where: { id },
      data: { questions: JSON.stringify(allQuestions) },
    })

    res.json({ message: "Questions added", questions: allQuestions })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router