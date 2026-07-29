import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return proxyToGateway(request, `/v1/admin/quizzes/${id}`)
}

// PATCH now requires `version` in the body (the value last read from GET) --
// catalog-svc uses it for optimistic concurrency: a stale version returns
// 409 instead of silently clobbering a concurrent edit. See
// apps/admin/quiz/[id]/page.tsx's save handler, updated to send it back.
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return proxyToGateway(request, `/v1/admin/quizzes/${id}`)
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return proxyToGateway(request, `/v1/admin/quizzes/${id}`)
}
