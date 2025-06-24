import { type NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"

// Mock results database
const results: any[] = []

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your-secret-key") as any

    const result = results.find((r) => r._id === params.id && r.userId === decoded.userId)

    if (!result) {
      return NextResponse.json({ message: "Result not found" }, { status: 404 })
    }

    return NextResponse.json({ result })
  } catch (error) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }
}
