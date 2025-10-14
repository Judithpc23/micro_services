import { NextRequest, NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const services = await servicesStore.getAll()
    
    if (services.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: "No services found to stop" 
      }, { status: 400 })
    }

    console.log(`🛑 Stopping ${services.length} services using docker-compose...`)

    // Use docker-compose to stop all services at once (much faster)
    try {
      console.log("🛑 Executing: docker-compose down")
      const { stdout, stderr } = await execAsync("docker-compose down", { cwd: process.cwd() })
      
      console.log("✅ Docker-compose output:", stdout)
      if (stderr) console.log("⚠️ Docker-compose stderr:", stderr)

      // Get status of all containers
      const { stdout: statusOutput } = await execAsync('docker ps --filter name=microservice- --format "{{.Names}} {{.Status}}"')
      const containerStatuses = statusOutput.trim().split('\n').filter(line => line.includes('microservice-'))

      const results = services.map(service => {
        const containerName = `microservice-${service.id}`
        const containerStatus = containerStatuses.find(status => status.includes(containerName))
        
        return {
          id: service.id,
          name: service.name,
          status: containerStatus?.includes('Up') ? "running" : "stopped"
        }
      })

      const successCount = results.filter(r => r.status === "stopped").length

      return NextResponse.json({
        success: successCount > 0,
        message: `Stopped ${successCount} out of ${services.length} services using docker-compose`,
        services: results,
        method: "docker-compose"
      })

    } catch (dockerError) {
      console.error("Docker-compose error, falling back to individual stops:", dockerError)
      
      // Fallback to individual stops if docker-compose fails
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
        message: `Stopped ${successCount} out of ${services.length} services (fallback method)`,
        services: results,
        method: "individual"
      })
    }

  } catch (error) {
    console.error("Bulk stop error:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to stop services",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
