import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, userType } = body

    console.log("Signup attempt for:", email, "as", userType)

    // Only allow student registration
    if (userType !== "student") {
      return NextResponse.json({ message: "Only student registration is allowed" }, { status: 400 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 })
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters long" }, { status: 400 })
    }

    // Create new user in the database
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password, // In production, hash this password
        isAdmin: false,
        userType: "student",
        createdAt: new Date(),
        lastLogin: new Date(),
        totalQuizzes: 0,
        averageScore: 0,
      },
    })

    // Generate simple token (in production, use proper JWT)
    const token = `${newUser.id}-${Date.now()}-${Math.random().toString(36)}`

    console.log("Signup successful for:", email)

    return NextResponse.json({
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
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
