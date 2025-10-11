import { NextRequest, NextResponse } from "next/server"
import { containerManager } from "@/lib/backend/container-manager"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    // Get all running microservice containers from Docker
    const { stdout } = await execAsync("docker ps --filter name=microservice- --format '{{.Names}}'")
    const containerNames = stdout.trim().split('\n').filter(name => name.includes('microservice-'))
    
    console.log("Found containers:", containerNames)

    // Force sync all containers with Docker state
    await containerManager.forceSyncAllContainers()

    return NextResponse.json({
      success: true,
      message: `Synchronized ${containerNames.length} containers with Docker state`,
      containers: containerNames
    })

  } catch (error) {
    console.error("Bulk sync error:", error)
    return NextResponse.json({
      success: false,
      message: "Failed to sync containers",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
