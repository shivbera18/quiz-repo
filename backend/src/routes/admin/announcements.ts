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

    const announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
    })

    res.json(announcements)
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

    const { title, content, priority, isActive, expiresAt, createdBy } = req.body

    const newAnnouncement = await prisma.announcement.create({
      data: {
        title,
        content,
        priority: priority || "normal",
        isActive: isActive ?? true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdBy: createdBy || "admin",
      },
    })

    res.status(201).json(newAnnouncement)
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
    const { title, content, priority, isActive, expiresAt } = req.body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (priority !== undefined) updateData.priority = priority
    if (isActive !== undefined) updateData.isActive = isActive
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null

    const updated = await prisma.announcement.update({
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
    await prisma.announcement.delete({ where: { id } })
    res.json({ message: "Announcement deleted" })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router