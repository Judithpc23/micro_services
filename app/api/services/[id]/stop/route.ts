import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"

// POST /api/services/[id]/stop - Stop a service container
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const service = servicesStore.getById(id)

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    // Stop the container
    const containerInfo = await containerManager.stopContainer(id)

    return NextResponse.json({
      success: true,
      message: `Service "${service.name}" stopped successfully`,
      container: containerInfo,
    })
  } catch (error) {
    console.error("[v0] Error stopping service:", error)
    return NextResponse.json(
      {
        error: "Failed to stop service",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
