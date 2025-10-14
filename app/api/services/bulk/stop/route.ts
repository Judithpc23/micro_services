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

    // Try docker-compose first, then fallback to individual stops
    try {
      console.log("🛑 Attempting docker-compose down first...")
      
      // Check if docker-compose has any services running
      const { stdout: composeStatus } = await execAsync("docker-compose ps --services", { cwd: process.cwd() })
      const composeServices = composeStatus.trim().split('\n').filter(service => service.length > 0)
      
      console.log(`📋 Docker-compose services found: ${composeServices.length}`, composeServices)
      
      if (composeServices.length > 0) {
        // Use docker-compose down for services managed by compose
        console.log("🛑 Executing: docker-compose down")
        const { stdout, stderr } = await execAsync("docker-compose down", { cwd: process.cwd() })
        
        console.log("✅ Docker-compose output:", stdout)
        if (stderr) console.log("⚠️ Docker-compose stderr:", stderr)
        
        // Also remove any remaining containers to prevent restart
        console.log("🗑️ Removing any remaining containers...")
        try {
          const { stdout: removeStdout, stderr: removeStderr } = await execAsync("docker-compose rm -f", { cwd: process.cwd() })
          console.log("✅ Docker-compose rm output:", removeStdout)
          if (removeStderr) console.log("⚠️ Docker-compose rm stderr:", removeStderr)
        } catch (rmError) {
          console.log("⚠️ Docker-compose rm failed (this is usually OK):", rmError)
        }
        
        // Get status after docker-compose down
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
      } else {
        console.log("📋 No docker-compose services found, falling back to individual stops...")
        throw new Error("No docker-compose services to stop")
      }

    } catch (dockerError) {
      console.log("📋 Docker-compose not available or no services, using individual stops...")
      
      // Get all running microservice containers
      const { stdout: runningContainers } = await execAsync('docker ps --filter name=microservice- --format "{{.Names}}"')
      const containerNames = runningContainers.trim().split('\n').filter(name => name.includes('microservice-'))
      
      console.log(`🛑 Found ${containerNames.length} running microservice containers:`, containerNames)
      
      const results = []
      
      if (containerNames.length > 0) {
        // Stop and remove all containers to prevent restart
        try {
          const stopCommand = `docker stop ${containerNames.join(' ')}`
          console.log("🛑 Executing:", stopCommand)
          const { stdout, stderr } = await execAsync(stopCommand)
          
          console.log("✅ Docker stop output:", stdout)
          if (stderr) console.log("⚠️ Docker stop stderr:", stderr)
          
          // Wait a moment for containers to stop
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Remove containers to prevent restart
          const removeCommand = `docker rm ${containerNames.join(' ')}`
          console.log("🗑️ Executing:", removeCommand)
          const { stdout: removeStdout, stderr: removeStderr } = await execAsync(removeCommand)
          
          console.log("✅ Docker rm output:", removeStdout)
          if (removeStderr) console.log("⚠️ Docker rm stderr:", removeStderr)
          
        } catch (stopError) {
          console.error("❌ Error stopping/removing containers:", stopError)
        }
      }
      
      // Get final status and create results
      const { stdout: statusOutput } = await execAsync('docker ps --filter name=microservice- --format "{{.Names}} {{.Status}}"')
      const containerStatuses = statusOutput.trim().split('\n').filter(line => line.includes('microservice-'))

      for (const service of services) {
        const containerName = `microservice-${service.id}`
        const containerStatus = containerStatuses.find(status => status.includes(containerName))
        
        results.push({
          id: service.id,
          name: service.name,
          status: containerStatus?.includes('Up') ? "running" : "stopped"
        })
      }

      const successCount = results.filter(r => r.status === "stopped").length

      return NextResponse.json({
        success: successCount > 0,
        message: `Stopped ${successCount} out of ${services.length} services using individual Docker commands`,
        services: results,
        method: "individual-docker"
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
