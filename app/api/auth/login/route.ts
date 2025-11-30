import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { email, password, userType } = body

    // Validate required fields
    if (!email || !password || !userType) {
      return NextResponse.json({ 
        message: "Email, password, and user type are required" 
      }, { status: 400 })
    }

    console.log("Login attempt for:", email, "as", userType)

    // Test database connection
    try {
      await prisma.$connect()
    } catch (dbError) {
      console.error("Database connection failed:", dbError)
      return NextResponse.json({ 
        message: "Database connection failed" 
      }, { status: 500 })
    }

    // Find user in the database
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase().trim() } 
    })
    
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
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      })
    } catch (updateError) {
      console.error("Failed to update last login:", updateError)
      // Continue anyway, don't fail the login
    }

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
    }
    
    return NextResponse.json({ 
      message: "Internal server error" 
    }, { status: 500 })
  } finally {
    // Always disconnect from database
    await prisma.$disconnect()
  }
}
