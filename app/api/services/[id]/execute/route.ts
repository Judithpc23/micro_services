import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"

// POST /api/services/[id]/execute - Execute a service (start container and return endpoint)
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const service = servicesStore.getById(id)

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    console.log("Executing service:", service.name)

    // Start the container
    const containerInfo = await containerManager.startContainer(service)

    return NextResponse.json({
      success: true,
      message: `Service "${service.name}" is now running`,
      serviceId: id,
      status: containerInfo.status,
      endpoint: containerInfo.endpoint,
      port: containerInfo.port,
      startedAt: containerInfo.startedAt,
    })
  } catch (error) {
    console.error("Error executing service:", error)
    return NextResponse.json(
      {
        error: "Failed to execute service",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
