import { NextRequest, NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"

export async function POST(request: NextRequest) {
  try {
    const services = servicesStore.getAll()
    
    if (services.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "No services found to start" 
      }, { status: 400 })
    }

    // Start each service individually using the container manager
    const results = []
    for (const service of services) {
      try {
        const containerInfo = await containerManager.startContainer(service)
        results.push({
          id: service.id,
          name: service.name,
          status: containerInfo.status,
          endpoint: containerInfo.endpoint
        })
      } catch (error) {
        results.push({
          id: service.id,
          name: service.name,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    const successCount = results.filter(r => r.status === "running").length

    return NextResponse.json({
      success: successCount > 0,
      message: `Started ${successCount} out of ${services.length} services`,
      services: results
    })

  } catch (error) {
    console.error("Bulk start error:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to start services",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
