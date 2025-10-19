import { NextRequest, NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"

export async function POST(request: NextRequest) {
  try {
    const services = await servicesStore.getAll()
    
    if (services.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "No services found to start" 
      }, { status: 400 })
    }

    console.log(`🚀 Starting ${services.length} services using container manager...`)

    const startResults = [] as Array<{
      id: string
      name: string
      status: string
      endpoint: string | null
      error?: string
    }>

    for (const service of services) {
      try {
        const info = await containerManager.startContainer(service)
        startResults.push({
          id: service.id,
          name: service.name,
          status: info.status,
          endpoint: info.endpoint,
        })
      } catch (startError) {
        console.error(`❌ Failed to start service ${service.id}:`, startError)
        startResults.push({
          id: service.id,
          name: service.name,
          status: "error",
          endpoint: null,
          error: startError instanceof Error ? startError.message : "Unknown error",
        })
      }
    }

    const runningCount = startResults.filter(result => result.status === "running").length

    return NextResponse.json({
      success: runningCount === services.length,
      message: `Started ${runningCount} out of ${services.length} services using container manager`,
      services: startResults,
      method: "container-manager",
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
