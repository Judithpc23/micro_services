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

    console.log(`🛑 Stopping ${services.length} services using container manager...`)

    const stopResults = [] as Array<{
      id: string
      name: string
      status: string
      error?: string
    }>

    for (const service of services) {
      try {
        console.log(`🛑 Stopping service ${service.id}`)
        const info = await containerManager.stopContainer(service.id)
        stopResults.push({
          id: service.id,
          name: service.name,
          status: info.status,
        })
      } catch (stopError) {
        console.error(`❌ Failed to stop service ${service.id}:`, stopError)
        stopResults.push({
          id: service.id,
          name: service.name,
          status: "error",
          error: stopError instanceof Error ? stopError.message : "Unknown error",
        })
      }
    }

    // Best-effort cleanup of any remaining Docker containers
    try {
      await containerManager.cleanupOrphanedContainers()
    } catch (cleanupError) {
      console.warn("⚠️ Cleanup after stop failed:", cleanupError)
    }

    const stoppedCount = stopResults.filter(result => result.status === "stopped").length

    return NextResponse.json({
      success: stoppedCount === services.length,
      message: `Stopped ${stoppedCount} out of ${services.length} services using container manager`,
      services: stopResults,
      method: "container-manager",
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
