import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function GET() {
  try {
    const services = await servicesStore.getAll()
    
    if (services.length === 0) {
      return NextResponse.json({
        success: true,
        services: [],
        message: "No services found"
      })
    }

    // Get status of all containers
    const { stdout: statusOutput } = await execAsync('docker ps --filter name=microservice- --format "{{.Names}} {{.Status}}"')
    const containerStatuses = statusOutput.trim().split('\n').filter(line => line.includes('microservice-'))

    const servicesWithStatus = services.map(service => {
      const containerName = `microservice-${service.id}`
      const containerStatus = containerStatuses.find(status => status.includes(containerName))
      
      return {
        ...service,
        containerStatus: containerStatus?.includes('Up') ? "running" : "stopped",
        endpoint: containerStatus?.includes('Up') ? `http://localhost:3000/${service.id}` : null
      }
    })

    return NextResponse.json({
      success: true,
      services: servicesWithStatus,
      message: `Retrieved status for ${services.length} services`
    })

  } catch (error) {
    console.error("Status check error:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to check service status",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
