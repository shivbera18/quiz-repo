import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export async function GET(request: NextRequest, props: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await props.params
  return proxyToGateway(request, `/v1/ai/quiz-generations/${jobId}`)
}
