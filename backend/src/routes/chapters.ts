import { Router } from "express"
import { prisma } from "../db.js"

const router = Router()

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const chapter = await prisma.chapter.findUnique({ where: { id } })

    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" })
    }

    res.json(chapter)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.get("/:id/quizzes", async (req, res) => {
  try {
    const { id } = req.params
    const quizzes = await prisma.quiz.findMany({
      where: { chapterId: id, isActive: true },
      orderBy: { createdAt: "desc" },
    })

    res.json(quizzes)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.post("/", async (req, res) => {
  try {
    const { name, description, subjectId } = req.body

    if (!name || !subjectId) {
      return res.status(400).json({ message: "Name and subjectId are required" })
    }

    const newChapter = await prisma.chapter.create({
      data: {
        name,
        description,
        subjectId,
      },
    })

    res.status(201).json(newChapter)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { name, description } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    const updatedChapter = await prisma.chapter.update({
      where: { id },
      data: updateData,
    })

    res.json(updatedChapter)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params
    await prisma.chapter.delete({ where: { id } })
    res.json({ message: "Chapter deleted" })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router