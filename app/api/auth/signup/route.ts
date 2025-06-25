import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"

// Initialize Prisma client with error handling
const prisma = new PrismaClient({
  errorFormat: 'pretty',
})

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { name, email, password, userType } = body

    // Validate required fields
    if (!name || !email || !password || !userType) {
      return NextResponse.json({ 
        message: "Name, email, password, and user type are required" 
      }, { status: 400 })
    }

    console.log("Signup attempt for:", email, "as", userType)

    // Only allow student registration
    if (userType !== "student") {
      return NextResponse.json({ message: "Only student registration is allowed" }, { status: 400 })
    }

    // Test database connection
    try {
      await prisma.$connect()
    } catch (dbError) {
      console.error("Database connection failed:", dbError)
      return NextResponse.json({ 
        message: "Database connection failed" 
      }, { status: 500 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() } 
    })
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
        name: name.trim(),
        email: email.toLowerCase().trim(),
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
    
    // More specific error messages based on error type
    if (error instanceof Error) {
      if (error.message.includes('connect')) {
        return NextResponse.json({ 
          message: "Database connection error" 
        }, { status: 500 })
      }
      if (error.message.includes('timeout')) {
        return NextResponse.json({ 
          message: "Request timeout" 
        }, { status: 504 })
      }
      if (error.message.includes('unique constraint')) {
        return NextResponse.json({ 
          message: "Email already exists" 
        }, { status: 400 })
      }
    }
    
    return NextResponse.json({ 
      message: "Internal server error" 
    }, { status: 500 })
  } finally {
    // Always disconnect from database
    await prisma.$disconnect()
  }
}
