import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

// Reads the legacy (pre-Attempt) QuizResult store -- see assessment-svc's
// legacy.ts. The old POST here (saving a result directly) is gone: quiz
// submission goes through POST /api/attempts/:id/submit now, which is the
// only place a score gets written.
export async function GET(request: NextRequest) {
  return proxyToGateway(request, "/v1/legacy-results")
}
