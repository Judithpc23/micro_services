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
        message: "No services found to start" 
      }, { status: 400 })
    }

    console.log(`🚀 Starting ${services.length} services using docker-compose...`)

    // Clean up any existing containers first
    try {
      console.log("🧹 Cleaning up existing containers...")
      await execAsync("docker-compose down", { cwd: process.cwd() })
    } catch (cleanupError) {
      console.log("⚠️ Cleanup warning (this is normal if no containers exist):", cleanupError)
    }

    // Use docker-compose to start all services at once (much faster)
    try {
      console.log("🚀 Executing: docker-compose up -d")
      const { stdout, stderr } = await execAsync("docker-compose up -d", { cwd: process.cwd() })
      
      console.log("✅ Docker-compose output:", stdout)
      if (stderr) console.log("⚠️ Docker-compose stderr:", stderr)

      // Wait a moment for containers to fully start
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Get status of all containers
      const { stdout: statusOutput } = await execAsync('docker ps --filter name=microservice- --format "{{.Names}} {{.Status}}"')
      const containerStatuses = statusOutput.trim().split('\n').filter(line => line.includes('microservice-'))

      console.log("📊 Container statuses:", containerStatuses)

      const results = services.map(service => {
        const containerName = `microservice-${service.id}`
        const containerStatus = containerStatuses.find(status => status.includes(containerName))
        
        return {
          id: service.id,
          name: service.name,
          status: containerStatus?.includes('Up') ? "running" : "stopped",
          endpoint: containerStatus?.includes('Up') ? `http://localhost:3000/${service.id}` : null
        }
      })

      const successCount = results.filter(r => r.status === "running").length

      console.log(`✅ Docker-compose success: ${successCount}/${services.length} services running`)

      return NextResponse.json({
        success: successCount > 0,
        message: `Started ${successCount} out of ${services.length} services using docker-compose`,
        services: results,
        method: "docker-compose"
      })

    } catch (dockerError) {
      console.error("❌ Docker-compose failed, falling back to individual starts:", dockerError)
      
      // Fallback to individual starts if docker-compose fails
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
        message: `Started ${successCount} out of ${services.length} services (fallback method)`,
        services: results,
        method: "individual"
      })
    }

  } catch (error) {
    console.error("Bulk start error:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to start services",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
