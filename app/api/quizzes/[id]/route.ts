import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // For demo purposes, return mock data
    const mockQuizzes = JSON.parse(localStorage.getItem("adminQuizzes") || "[]")
    const quiz = mockQuizzes.find((q: any) => q.id === params.id)

    if (!quiz) {
      return NextResponse.json({ message: "Quiz not found" }, { status: 404 })
    }

    // Return quiz with questions (without correct answers for users)
    const quizForUser = {
      ...quiz,
      questions: quiz.questions.map((q: any) => ({
        id: q.id,
        section: q.section,
        question: q.question,
        options: q.options,
      })),
    }

    return NextResponse.json({ quiz: quizForUser })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
