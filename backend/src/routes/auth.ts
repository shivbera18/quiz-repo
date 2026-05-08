import { Router } from "express"
import { prisma } from "../db.js"

const router = Router()

router.post("/login", async (req, res) => {
  try {
    const { email, password, userType } = req.body

    if (!email || !password || !userType) {
      return res.status(400).json({ message: "Email, password, and user type are required" })
    }

    console.log("Login attempt for:", email, "as", userType)

    try {
      await prisma.$connect()
    } catch (dbError) {
      console.error("Database connection failed:", dbError)
      return res.status(500).json({ message: "Database connection failed" })
    }

    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() } 
    })
    
    if (!user) {
      console.log("User not found")
      return res.status(401).json({ message: "Invalid credentials" })
    }

    if (userType === "admin" && !user.isAdmin) {
      console.log("Non-admin trying to access admin login")
      return res.status(403).json({ message: "Access denied. Admin credentials required." })
    }

    if (userType === "student" && user.isAdmin) {
      console.log("Admin trying to access student login")
      return res.status(403).json({ message: "Please use admin login for administrative access." })
    }

    if (user.password !== password) {
      console.log("Invalid password")
      return res.status(401).json({ message: "Invalid credentials" })
    }

    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      })
    } catch (updateError) {
      console.error("Failed to update last login:", updateError)
    }

    const token = `${user.id}-${Date.now()}-${Math.random().toString(36)}`

    console.log("Login successful for:", email, "as", userType)

    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        userType: user.userType,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    
    if (error instanceof Error) {
      if (error.message.includes('connect')) {
        return res.status(500).json({ message: "Database connection error" })
      }
      if (error.message.includes('timeout')) {
        return res.status(504).json({ message: "Request timeout" })
      }
    }
    
    return res.status(500).json({ message: "Internal server error" })
  } finally {
    await prisma.$disconnect()
  }
})

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, userType } = req.body

    if (!name || !email || !password || !userType) {
      return res.status(400).json({ message: "All fields are required" })
    }

    console.log("Signup attempt for:", email)

    try {
      await prisma.$connect()
    } catch (dbError) {
      console.error("Database connection failed:", dbError)
      return res.status(500).json({ message: "Database connection failed" })
    }

    const existingUser = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() } 
    })
    
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" })
    }

    const isAdmin = userType === "admin"

    const newUser = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password,
        isAdmin,
        userType,
      },
    })

    const token = `${newUser.id}-${Date.now()}-${Math.random().toString(36)}`

    console.log("Signup successful for:", email)

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
        userType: newUser.userType,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    return res.status(500).json({ message: "Internal server error" })
  } finally {
    await prisma.$disconnect()
  }
})

export default router