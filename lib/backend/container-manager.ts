import type { Microservice } from "@/lib/types/microservice"
import { robleClient } from "@/lib/backend/roble-client"
import { createLogger } from "@/lib/backend/logger"
import { generateServiceFiles } from "@/lib/docker/dockerfile-generator"

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
	  private networkName = process.env.DOCKER_NETWORK_NAME || "microservices_net"
	  	private docker: any = null // initialized lazily to avoid bundler issues
	private log = createLogger("container-manager")

	getContainerInfo(serviceId: string): ContainerInfo | undefined {
		return this.containers.get(serviceId)
	}

	async startContainer(service: Microservice): Promise<ContainerInfo> {
		const existing = this.containers.get(service.id)
		if (existing?.status === "running") return existing

		// Allocate a deterministic host port per service to avoid collisions
		const port = this.allocatePort(service.id)
		// Public endpoint should be standardized to localhost:3000/{id}
		const endpointPath = `http://localhost:3000/${service.id}`
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
				info.endpoint = `http://localhost:3000/${service.id}`
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
		this.log.info("[docker] build & run", { serviceId: service.id, port })
		try {
			// Generate service files
			const files = generateServiceFiles(service)
			// lazy-load tar-stream and dockerode to avoid bundling native modules in Next
			const tarMod = await import("tar-stream")
			const pack = tarMod.pack()

			// Add Dockerfile
			pack.entry({ name: `Dockerfile.${service.id}` }, files.dockerfile)
			// Add code file and dependencies
			if (service.language === "python") {
				pack.entry({ name: "main.py" }, files.code)
				pack.entry({ name: "requirements.txt" }, files.dependencies)
			} else {
				pack.entry({ name: "index.js" }, files.code)
				pack.entry({ name: "package.json" }, files.dependencies)
			}
			pack.finalize()
			// lazy-load dockerode
			const dockerMod = await import("dockerode")
			const Docker = dockerMod.default ?? dockerMod
			this.docker = this.docker ?? new Docker()

			const buildStream = await this.docker.buildImage(pack, {
				t: `microservice-${service.id}:latest`,
				// Use Dockerfile name matching entry
				dockerfile: `Dockerfile.${service.id}`,
			})

			await new Promise((resolve, reject) => {
				this.docker.modem.followProgress(buildStream, (err: any, res: any) => (err ? reject(err) : resolve(res)))
			})

			// Ensure network exists
			let network = null
			try {
				network = await this.docker.getNetwork(this.networkName).inspect()
			} catch (e) {
				this.log.info("creating network", { network: this.networkName })
				await this.docker.createNetwork({ Name: this.networkName, Driver: "bridge" })
			}

			const containerName = `microservice-${service.id}`
			// remove existing container if present
			try {
				const existingContainer = this.docker.getContainer(containerName)
				await existingContainer.remove({ force: true })
			} catch {}

			// create & start container
			const binds: string[] = []
			const env: string[] = []
			if (service.type === "roble" && service.tokenDatabase) env.push(`SERVICE_TOKEN=${service.tokenDatabase}`)
			const created = await this.docker.createContainer({
				name: containerName,
				Image: `microservice-${service.id}:latest`,
				Env: env,
				ExposedPorts: { "3000/tcp": {} },
				HostConfig: {
					PortBindings: { "3000/tcp": [{ HostPort: `${port}` }] },
					NetworkMode: this.networkName,
					Binds: binds,
				},
				NetworkingConfig: {},
			})

			await created.start()

			info.status = "running"
			info.endpoint = `http://localhost:3000`
		} catch (err: any) {
			this.log.error("docker build/run failed", { err: err?.message || err, serviceId: service.id })
			info.status = "error"
			info.error = String(err?.message || err)
		}
	}

	private async stopDockerContainer(serviceId: string) {
		this.log.info("[docker] stop", { serviceId })
		try {
			const containerName = `microservice-${serviceId}`
			const container = this.docker.getContainer(containerName)
			await container.stop().catch(() => {})
			await container.remove().catch(() => {})
			// optionally remove image
			try { await this.docker.getImage(`microservice-${serviceId}:latest`).remove() } catch {}
		} catch (err) {
			this.log.error("docker stop failed", { err, serviceId })
		}
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
