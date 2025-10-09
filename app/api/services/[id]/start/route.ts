import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"

// POST /api/services/[id]/start - Start a service container
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const service = servicesStore.getById(id)

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    // Start the container
    const containerInfo = await containerManager.startContainer(service)

    return NextResponse.json({
      success: true,
      message: `Service "${service.name}" started successfully`,
      container: containerInfo,
    })
  } catch (error) {
    console.error("[v0] Error starting service:", error)
    return NextResponse.json(
      {
        error: "Failed to start service",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
