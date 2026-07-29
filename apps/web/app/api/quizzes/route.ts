import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

// catalog-svc's metadata-only quiz list -- no `questions`/answer keys leave
// this route. Quiz-taking goes through POST /api/attempts instead, which is
// the only place a stripped (no correctAnswer) question set is served.
export async function GET(request: NextRequest) {
  return proxyToGateway(request, "/v1/quizzes")
}
