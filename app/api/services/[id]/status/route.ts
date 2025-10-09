import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"

// GET /api/services/[id]/status - Get service container status
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const service = servicesStore.getById(id)

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    const containerInfo = containerManager.getContainerInfo(id)

    return NextResponse.json({
      serviceId: id,
      serviceName: service.name,
      container: containerInfo || {
        serviceId: id,
        status: "stopped",
        endpoint: null,
        port: null,
        startedAt: null,
        stoppedAt: null,
        error: null,
      },
    })
  } catch (error) {
    console.error("[v0] Error getting service status:", error)
    return NextResponse.json({ error: "Failed to get service status" }, { status: 500 })
  }
}
