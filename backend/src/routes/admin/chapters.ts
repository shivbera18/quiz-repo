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

    const chapters = await prisma.chapter.findMany({
      orderBy: { name: "asc" },
      include: {
        subject: true,
      },
    })

    res.json(chapters)
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

    const { name, description, subjectId } = req.body

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
    const token = getTokenFromHeader(req)
    if (!validateToken(token)) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const { id } = req.params
    const { name, description, subjectId } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (subjectId !== undefined) updateData.subjectId = subjectId

    const updated = await prisma.chapter.update({
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
    await prisma.chapter.delete({ where: { id } })
    res.json({ message: "Chapter deleted" })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router