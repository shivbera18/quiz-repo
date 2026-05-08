import { Router } from "express"
import { prisma } from "../db.js"

const router = Router()

router.get("/", async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })
    res.json(announcements)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params
    const announcement = await prisma.announcement.findUnique({ where: { id } })

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" })
    }

    res.json(announcement)
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.put("/:id", async (req, res) => {
  try {
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
    const { id } = req.params
    await prisma.announcement.delete({ where: { id } })
    res.json({ message: "Announcement deleted" })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

router.post("/:id/repush", async (req, res) => {
  try {
    const { id } = req.params
    const announcement = await prisma.announcement.findUnique({ where: { id } })

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" })
    }

    res.json({ message: "Repushed notification", announcement })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router