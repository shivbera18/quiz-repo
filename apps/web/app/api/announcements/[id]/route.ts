import { type NextRequest } from "next/server"
import { proxyToGateway } from "@/lib/gateway-client"

export const dynamic = "force-dynamic"

// Mark-as-read is a user action (notification-svc's non-admin route);
// update/delete are admin-only and live under /v1/admin/announcements/:id.
// The old monolith served all three off one path -- split here to match.
export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return proxyToGateway(request, `/v1/announcements/${id}/read`)
}

export async function PUT(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return proxyToGateway(request, `/v1/admin/announcements/${id}`)
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params
  return proxyToGateway(request, `/v1/admin/announcements/${id}`)
}
