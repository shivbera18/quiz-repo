import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return proxyToGateway(request, `/v1/subjects/${id}`)
}
