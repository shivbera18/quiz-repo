import { type NextRequest, NextResponse } from "next/server"

// Force this route to be dynamic (not statically rendered)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Simple token validation
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    // Return questions for specific quiz
    return NextResponse.json({ questions: [] })
  } catch (error) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Simple token validation
    if (!token || token.length < 10) {
      return NextResponse.json({ message: "Invalid token" }, { status: 401 })
    }

    const { section, question, options, correctAnswer, explanation } = await request.json()

    const newQuestion = {
      id: Date.now().toString(),
      quizId: params.id,
      section,
      question,
      options,
      correctAnswer,
      explanation: explanation || "",
      createdAt: new Date().toISOString(),
    }

    return NextResponse.json({ question: newQuestion })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
