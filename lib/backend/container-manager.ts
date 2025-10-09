import type { Microservice } from "@/lib/types/microservice"
import { robleClient } from "@/lib/backend/roble-client"
import { createLogger } from "@/lib/backend/logger"

export type ContainerStatus = "starting" | "running" | "stopped" | "error"

export interface ContainerInfo {
	serviceId: string
	status: ContainerStatus
	endpoint: string | null
	port: number | null
	startedAt: string | null
	stoppedAt: string | null
	error: string | null
}

// Fake container manager for demo purposes. Replace with real Docker control if needed.
class ContainerManager {
	private containers = new Map<string, ContainerInfo>()
	// Base port for local execution services. Override with SERVICE_BASE_PORT env.
	private basePort = Number(process.env.SERVICE_BASE_PORT || 45000)
	private robleJobs = new Map<string, string>() // serviceId -> jobId
	private enableDocker = process.env.ENABLE_DOCKER_RUNTIME === "true"
	private log = createLogger("container-manager")

	getContainerInfo(serviceId: string): ContainerInfo | undefined {
		return this.containers.get(serviceId)
	}

	async startContainer(service: Microservice): Promise<ContainerInfo> {
		const existing = this.containers.get(service.id)
		if (existing?.status === "running") return existing

		// All services expose on fixed port 3000 under a path with their id
		const port = 3000
		const endpointPath = `http://localhost:${port}/${service.id}`
		const info: ContainerInfo = {
			serviceId: service.id,
			status: "starting",
			endpoint: null,
			port,
			startedAt: new Date().toISOString(),
			stoppedAt: null,
			error: null,
		}

		this.containers.set(service.id, info)

		// Simulate or real startup
		if (this.enableDocker) {
			await this.buildAndRunDocker(service, port, info)
		} else {
			await new Promise((r) => setTimeout(r, 200))
			// Standardize endpoint for all services to http://localhost:3000/{id}
			if (service.type === "roble" && service.tokenDatabase) {
				// Even when delegating to Roble, expose a local status/endpoint path
				const res = await robleClient.runService(service, service.tokenDatabase)
				if (res.jobId) this.robleJobs.set(service.id, res.jobId)
				info.status = "running"
				info.endpoint = endpointPath
				info.port = null
			} else {
				info.status = "running"
				info.endpoint = endpointPath
			}
		}
		this.containers.set(service.id, info)
		return info
	}

	async stopContainer(serviceId: string): Promise<ContainerInfo> {
		const existing = this.containers.get(serviceId)
		if (!existing) {
			const info: ContainerInfo = {
				serviceId,
				status: "stopped",
				endpoint: null,
				port: null,
				startedAt: null,
				stoppedAt: new Date().toISOString(),
				error: null,
			}
			this.containers.set(serviceId, info)
			return info
		}

		const jobId = this.robleJobs.get(serviceId)
		if (jobId) {
			try { await robleClient.stopService(jobId, "") } catch {}
			this.robleJobs.delete(serviceId)
		}

		if (this.enableDocker) {
			await this.stopDockerContainer(serviceId)
		}
		existing.status = "stopped"
		existing.endpoint = null
		existing.stoppedAt = new Date().toISOString()
		this.containers.set(serviceId, existing)
		return existing
	}

	// ===== Real Docker placeholders =====
	private async buildAndRunDocker(service: Microservice, port: number, info: ContainerInfo) {
		// Aquí iría la lógica real (dockerode o CLI). Placeholder:
		this.log.info("[docker] build & run (placeholder)", { serviceId: service.id, port })
		await new Promise((r) => setTimeout(r, 500))
		info.status = "running"
		info.endpoint = `http://localhost:${port}`
	}

	private async stopDockerContainer(serviceId: string) {
		this.log.info("[docker] stop (placeholder)", { serviceId })
		await new Promise((r) => setTimeout(r, 150))
	}

	private allocatePort(serviceId: string): number {
		// deterministic but simple port based on hash of id
		let hash = 0
		for (let i = 0; i < serviceId.length; i++) hash = (hash * 31 + serviceId.charCodeAt(i)) >>> 0
		return this.basePort + (hash % 1000)
	}
}

export const containerManager = new ContainerManager()
// Persist across HMR in dev
declare global {
	// eslint-disable-next-line no-var
	var __containerManager: ContainerManager | undefined
}

;(globalThis as any).__containerManager ??= containerManager
