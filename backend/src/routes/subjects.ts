import { Router } from "express"
import { prisma } from "../db.js"

const router = Router()

router.get("/", async (req, res) => {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      include: {
        chapters: {
          select: { id: true, name: true },
        },
      },
    })

    res.json(subjects)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const subject = await prisma.subject.findUnique({ where: { id } })

    if (!subject) {
      return res.status(404).json({ message: "Subject not found" })
    }

    res.json(subject)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.get("/:id/chapters", async (req, res) => {
  try {
    const { id } = req.params
    const chapters = await prisma.chapter.findMany({
      where: { subjectId: id },
      orderBy: { name: "asc" },
    })

    res.json(chapters)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.post("/", async (req, res) => {
  try {
    const { name, description, icon, color } = req.body

    if (!name) {
      return res.status(400).json({ message: "Name is required" })
    }

    const newSubject = await prisma.subject.create({
      data: {
        name,
        description,
        icon,
        color,
      },
    })

    res.status(201).json(newSubject)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const { name, description, icon, color } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (icon !== undefined) updateData.icon = icon
    if (color !== undefined) updateData.color = color

    const updatedSubject = await prisma.subject.update({
      where: { id },
      data: updateData,
    })

    res.json(updatedSubject)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params
    await prisma.subject.delete({ where: { id } })
    res.json({ message: "Subject deleted" })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router