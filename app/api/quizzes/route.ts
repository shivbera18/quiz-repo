import { type NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@/lib/generated/prisma/client"
import jwt from "jsonwebtoken"

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // For demo purposes, return mock data without auth
      const mockQuizzes = JSON.parse(localStorage.getItem("adminQuizzes") || "[]")
      const activeQuizzes = mockQuizzes.filter((quiz: any) => quiz.isActive)
      return NextResponse.json({ quizzes: activeQuizzes })
    }

    const token = authHeader.substring(7)
    jwt.verify(token, process.env.JWT_SECRET || "banking-exam-secret-key-2024")

    // Fetch all active quizzes from the database
    const quizzes = await prisma.quiz.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(quizzes)
  } catch (error) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}
