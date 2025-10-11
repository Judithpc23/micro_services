import { NextRequest, NextResponse } from "next/server"
import { containerManager } from "@/lib/backend/container-manager"

export async function GET(request: NextRequest) {
  try {
    // Get all container info from container manager
    const containerStates = new Map()
    
    // Get all services from the store
    const { servicesStore } = await import("@/lib/backend/services-store")
    const services = servicesStore.getAll()
    
    for (const service of services) {
      const containerInfo = containerManager.getContainerInfo(service.id)
      containerStates.set(service.id, {
        serviceId: service.id,
        serviceName: service.name,
        containerStatus: containerInfo?.status || "unknown",
        endpoint: containerInfo?.endpoint || null,
        port: containerInfo?.port || null
      })
    }

    return NextResponse.json({
      success: true,
      message: "Container states retrieved",
      containers: Array.from(containerStates.values())
    })

  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to get container states",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
