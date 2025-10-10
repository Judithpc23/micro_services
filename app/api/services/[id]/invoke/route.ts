import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"

// POST /api/services/[id]/invoke
// Body: { token?: string, params?: Record<string, any> }
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const service = servicesStore.getById(id)
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    // Ensure container is running
    let info = containerManager.getContainerInfo(id)
    if (!info || info.status !== "running") {
      info = await containerManager.startContainer(service)
    }

    return NextResponse.json({
      message: "Service ready",
      serviceId: id,
      endpoint: info.endpoint,
      status: info.status,
    })
  } catch (e) {
    return NextResponse.json({ error: "Failed to invoke", detail: String(e) }, { status: 500 })
  }
}