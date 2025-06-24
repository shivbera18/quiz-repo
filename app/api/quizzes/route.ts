import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

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

    // Return active quizzes for users
    const mockQuizzes = JSON.parse(localStorage.getItem("adminQuizzes") || "[]")
    const activeQuizzes = mockQuizzes.filter((quiz: any) => quiz.isActive)

    return NextResponse.json({ quizzes: activeQuizzes })
  } catch (error) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}
