import { type NextRequest, NextResponse } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  return proxyToGateway(request, "/v1/admin/chapters")
}

// Old route took the id as a query param; catalog-svc's route takes it as a
// path param -- adapt here so the client doesn't need to change.
export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get("id")
  if (!id) {
    return NextResponse.json({ message: "Chapter ID is required" }, { status: 400 })
  }
  return proxyToGateway(request, `/v1/admin/chapters/${id}`)
}
