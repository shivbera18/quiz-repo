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
      orderBy: { createdAt: "desc" },
    })

    res.json(users)
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

    const { name, email, password, isAdmin, userType } = req.body

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password,
        isAdmin: isAdmin || false,
        userType: userType || "student",
      },
    })

    res.status(201).json(newUser)
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
    const { name, email, isAdmin, userType, totalQuizzes, averageScore } = req.body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (email !== undefined) updateData.email = email.toLowerCase()
    if (isAdmin !== undefined) updateData.isAdmin = isAdmin
    if (userType !== undefined) updateData.userType = userType
    if (totalQuizzes !== undefined) updateData.totalQuizzes = totalQuizzes
    if (averageScore !== undefined) updateData.averageScore = averageScore

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    })

    res.json(updatedUser)
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
    await prisma.user.delete({ where: { id } })
    res.json({ message: "User deleted" })
  } catch (error) {
    res.status(500).json({ message: "Internal server error" })
  }
})

export default router