import { PrismaClient } from "@/lib/generated/prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      include: { quizHistory: true },
    })
    const progress = users.map((user) => {
      const attempts = user.quizHistory.length
      const avgScore = attempts > 0 ? Math.round(user.quizHistory.reduce((sum, r) => sum + r.totalScore, 0) / attempts) : 0
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        attempts,
        avgScore,
        lastLogin: user.lastLogin,
      }
    })
    return NextResponse.json({ progress })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
