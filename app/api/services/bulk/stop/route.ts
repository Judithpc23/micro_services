import { NextRequest, NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"

export async function POST(request: NextRequest) {
  try {
    const services = await servicesStore.getAll()
    
    if (services.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "No services found to stop" 
      }, { status: 400 })
    }

    // Stop each service individually using the container manager
    const results = []
    for (const service of services) {
      try {
        const containerInfo = await containerManager.stopContainer(service.id)
        results.push({
          id: service.id,
          name: service.name,
          status: containerInfo.status
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

    const successCount = results.filter(r => r.status === "stopped").length

    return NextResponse.json({
      success: successCount > 0,
      message: `Stopped ${successCount} out of ${services.length} services`,
      services: results
    })

  } catch (error) {
    console.error("Bulk stop error:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to stop services",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
