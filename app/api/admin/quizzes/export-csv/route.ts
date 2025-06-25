import { PrismaClient } from "@/lib/generated/prisma"
import { NextResponse } from "next/server"
import { parse } from "json2csv"

const prisma = new PrismaClient()

export async function GET() {
  try {
    const results = await prisma.quizResult.findMany()
    const fields = ["userName", "userEmail", "quizId", "date", "totalScore", "timeSpent"]
    const csv = parse(results, { fields })
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=quiz-results.csv",
      },
    })
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
