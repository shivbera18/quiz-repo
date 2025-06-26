import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma"

const prisma = new PrismaClient()

// Force this route to be dynamic (not statically rendered)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Fetch users from the database
    const users = await prisma.user.findMany()
    const results = await prisma.quizResult.findMany()

    // Calculate stats for each user
    const usersWithStats = users.map((user) => {
      const userResults = results.filter((r) => r.userId === user.id)
      const totalAttempts = userResults.length
      const averageScore =
        totalAttempts > 0 ? Math.round(userResults.reduce((sum, r) => sum + r.totalScore, 0) / totalAttempts) : 0
      const bestScore = totalAttempts > 0 ? Math.max(...userResults.map((r) => r.totalScore)) : 0
      const lastActive = userResults.length > 0 ? userResults[userResults.length - 1].date : user.lastLogin

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        isAdmin: user.isAdmin,
        joinDate: user.createdAt,
        lastActive,
        totalAttempts,
        averageScore,
        bestScore,
      }
    })

    return NextResponse.json({ users: usersWithStats })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
