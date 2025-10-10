import type { Microservice } from "@/lib/types/microservice"

export type ContainerStatus = "stopped" | "starting" | "running" | "stopping" | "error"

export interface ContainerInfo {
  serviceId: string
  status: ContainerStatus
  endpoint: string | null
  port: number | null
  startedAt: Date | null
  stoppedAt: Date | null
  error: string | null
}

class ContainerManager {
  private containers: Map<string, ContainerInfo> = new Map()
  // All services map to port 3000 with a unique path per service id
  private readonly fixedPort = 3000

  getContainerInfo(serviceId: string): ContainerInfo | undefined {
    return this.containers.get(serviceId)
  }

  getAllContainers(): ContainerInfo[] {
    return Array.from(this.containers.values())
  }

  async startContainer(service: Microservice): Promise<ContainerInfo> {
    const existingContainer = this.containers.get(service.id)

    // If already running, return existing info
    if (existingContainer?.status === "running") {
      return existingContainer
    }

  // Endpoint format required: http://localhost:3000/{id}
  const port = this.fixedPort
  const endpoint = `http://localhost:3000/${service.id}`

    // Update status to starting
    const containerInfo: ContainerInfo = {
      serviceId: service.id,
      status: "starting",
      endpoint: null,
      port,
      startedAt: null,
      stoppedAt: null,
      error: null,
    }

    this.containers.set(service.id, containerInfo)

    // Simulate Docker container startup
    // In production, this would execute actual Docker commands
    try {
      console.log(`Starting container for service ${service.name} on port ${port}`)

      // Simulate startup delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

  // Update to running status. All services expose on localhost:3000/{id}
  containerInfo.status = "running"
  containerInfo.endpoint = endpoint
  containerInfo.startedAt = new Date()
  containerInfo.error = null

      this.containers.set(service.id, containerInfo)

      console.log(`Container started successfully: ${endpoint}`)

      return containerInfo
    } catch (error) {
      containerInfo.status = "error"
      containerInfo.error = error instanceof Error ? error.message : "Unknown error"
      this.containers.set(service.id, containerInfo)
      throw error
    }
  }

  async stopContainer(serviceId: string): Promise<ContainerInfo> {
    const containerInfo = this.containers.get(serviceId)

    if (!containerInfo) {
      throw new Error("Container not found")
    }

    if (containerInfo.status === "stopped") {
      return containerInfo
    }

    // Update status to stopping
    containerInfo.status = "stopping"
    this.containers.set(serviceId, containerInfo)

    try {
      console.log(`Stopping container for service ${serviceId}`)

      // Simulate shutdown delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update to stopped status
      containerInfo.status = "stopped"
      containerInfo.endpoint = null
      containerInfo.stoppedAt = new Date()

      this.containers.set(serviceId, containerInfo)

      console.log(`Container stopped successfully`)

      return containerInfo
    } catch (error) {
      containerInfo.status = "error"
      containerInfo.error = error instanceof Error ? error.message : "Unknown error"
      this.containers.set(serviceId, containerInfo)
      throw error
    }
  }

  async restartContainer(service: Microservice): Promise<ContainerInfo> {
    await this.stopContainer(service.id)
    return await this.startContainer(service)
  }

  getContainerStatus(serviceId: string): ContainerStatus {
    return this.containers.get(serviceId)?.status || "stopped"
  }
}

// Singleton instance
export const containerManager = new ContainerManager()
