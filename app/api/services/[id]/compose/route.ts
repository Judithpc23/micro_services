import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { generateDockerCompose, generateStartScript, generateStopScript } from "@/lib/docker/docker-compose-generator"
import { containerManager } from "@/lib/backend/container-manager"

// GET /api/services/[id]/compose - Get Docker Compose configuration
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const service = servicesStore.getById(id)

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    // Get container info to determine port
    const containerInfo = containerManager.getContainerInfo(id)
    const port = containerInfo?.port || 8080

    const dockerCompose = generateDockerCompose(service, port)
    const startScript = generateStartScript(id)
    const stopScript = generateStopScript(id)

    return NextResponse.json({
      dockerCompose,
      startScript,
      stopScript,
      port,
    })
  } catch (error) {
    console.error("Error generating Docker Compose:", error)
    return NextResponse.json({ error: "Failed to generate Docker Compose configuration" }, { status: 500 })
  }
}
