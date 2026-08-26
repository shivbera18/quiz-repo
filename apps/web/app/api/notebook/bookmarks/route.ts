import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return proxyToGateway(request, "/v1/notebook/bookmarks")
}

export async function DELETE(request: NextRequest) {
  // questionId travels as a query param so one file serves both verbs.
  const questionId = new URL(request.url).searchParams.get("questionId")
  if (!questionId) {
    return Response.json({ message: "questionId is required" }, { status: 400 })
  }
  return proxyToGateway(request, `/v1/notebook/bookmarks/${encodeURIComponent(questionId)}`)
}
