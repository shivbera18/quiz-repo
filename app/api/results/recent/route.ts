import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

// Mock results database
const results: any[] = []

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any

    const userResults = results
      .filter((r) => r.userId === decoded.userId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)

    return NextResponse.json({ attempts: userResults })
  } catch (error) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}
