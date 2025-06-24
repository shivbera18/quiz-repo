import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma/client"

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, userType } = body

    console.log("Login attempt for:", email, "as", userType)

    // Find user in the database
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      console.log("User not found")
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    // Check if user type matches
    if (userType === "admin" && !user.isAdmin) {
      console.log("Non-admin trying to access admin login")
      return NextResponse.json({ message: "Access denied. Admin credentials required." }, { status: 403 })
    }

    if (userType === "student" && user.isAdmin) {
      console.log("Admin trying to access student login")
      return NextResponse.json({ message: "Please use admin login for administrative access." }, { status: 403 })
    }

    // Check password (simple comparison for demo)
    if (user.password !== password) {
      console.log("Invalid password")
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    })

    // Generate simple token (in production, use proper JWT)
    const token = `${user.id}-${Date.now()}-${Math.random().toString(36)}`

    console.log("Login successful for:", email, "as", userType)

    return NextResponse.json({
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
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
