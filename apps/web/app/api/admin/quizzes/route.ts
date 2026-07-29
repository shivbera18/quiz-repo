import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

// Note: catalog-svc's list intentionally drops attempts/avgScore/avgTime --
// those numbers are analytics-svc's job now (GET /v1/analytics/quizzes),
// not a cross-service join. See catalog-svc's own route comment.
export async function GET(request: NextRequest) {
  return proxyToGateway(request, "/v1/admin/quizzes")
}

export async function POST(request: NextRequest) {
  return proxyToGateway(request, "/v1/admin/quizzes")
}
