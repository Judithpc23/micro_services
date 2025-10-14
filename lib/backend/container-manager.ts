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
	private containerIntervals = new Map<string, NodeJS.Timeout>() // serviceId -> interval
	
	constructor() {
		console.log("🔧 ContainerManager Debug:", {
			ENABLE_DOCKER_RUNTIME: process.env.ENABLE_DOCKER_RUNTIME,
			enableDocker: this.enableDocker,
			basePort: this.basePort,
			networkName: this.networkName
		})
		this.log.info("ContainerManager initialized", { 
			enableDocker: this.enableDocker, 
			basePort: this.basePort,
			networkName: this.networkName 
		})
		
		// Initialize Docker connection and sync existing containers
		if (this.enableDocker) {
			this.initializeDockerConnection()
		}
	}

	private async initializeDockerConnection() {
		try {
			const dockerMod = await import("dockerode")
			const Docker = dockerMod.default ?? dockerMod
			this.docker = new Docker()
			
			// Sync all existing containers
			await this.syncAllContainers()
		} catch (err) {
			this.log.error("Failed to initialize Docker connection", { err })
		}
	}

	private async syncAllContainers() {
		if (!this.docker) return

		try {
			const containers = await this.docker.listContainers({ all: false })
			const microserviceContainers = containers.filter((c: any) => 
				c.Names.some((name: string) => name.includes('microservice-'))
			)

			for (const container of microserviceContainers) {
				const serviceId = container.Names[0].replace('/microservice-', '')
				const port = container.Ports[0]?.PublicPort || this.allocatePort(serviceId)
				
				const info: ContainerInfo = {
					serviceId,
					status: "running",
					endpoint: `http://localhost:3000/${serviceId}`,
					port,
					startedAt: new Date(container.Created * 1000).toISOString(),
					stoppedAt: null,
					error: null,
				}
				
				this.containers.set(serviceId, info)
				this.log.info("Synced existing container", { serviceId, status: "running" })
			}
		} catch (err) {
			this.log.error("Failed to sync containers", { err })
		}
	}
	  private networkName = process.env.DOCKER_NETWORK_NAME || "microservices_net"
	  	private docker: any = null // initialized lazily to avoid bundler issues
	private log = createLogger("container-manager")

	getContainerInfo(serviceId: string): ContainerInfo | undefined {
		// Return current state without async sync to avoid blocking
		return this.containers.get(serviceId)
	}

	async forceSyncAllContainers(): Promise<void> {
		console.log("🔄 Force sync started", { enableDocker: this.enableDocker, hasDocker: !!this.docker })
		
		if (!this.enableDocker) {
			console.log("❌ Docker not enabled")
			return
		}
		
		if (!this.docker) {
			console.log("❌ Docker not initialized, trying to initialize...")
			try {
				const dockerMod = await import("dockerode")
				const Docker = dockerMod.default ?? dockerMod
				this.docker = new Docker()
				console.log("✅ Docker initialized")
			} catch (err) {
				console.log("❌ Failed to initialize Docker", err)
				return
			}
		}

		try {
			console.log("🔍 Listing containers...")
			const containers = await this.docker.listContainers({ all: false })
			console.log("📦 Found containers:", containers.length)
			
			const microserviceContainers = containers.filter((c: any) => 
				c.Names.some((name: string) => name.includes('microservice-'))
			)
			console.log("🎯 Microservice containers:", microserviceContainers.length)

			// Clear existing container info
			this.containers.clear()
			console.log("🧹 Cleared existing container info")

			for (const container of microserviceContainers) {
				const serviceId = container.Names[0].replace('/microservice-', '')
				const port = container.Ports[0]?.PublicPort || this.allocatePort(serviceId)
				
				const info: ContainerInfo = {
					serviceId,
					status: "running",
					endpoint: `http://localhost:3000/${serviceId}`,
					port,
					startedAt: new Date(container.Created * 1000).toISOString(),
					stoppedAt: null,
					error: null,
				}
				
				this.containers.set(serviceId, info)
				console.log("✅ Synced container", { serviceId, status: "running", port })
			}
			
			console.log("🎉 Force sync completed", { syncedCount: microserviceContainers.length })
		} catch (err) {
			console.log("❌ Failed to force sync containers", err)
			this.log.error("Failed to force sync containers", { err })
		}
	}

	private async syncWithDockerState(serviceId: string) {
		if (!this.enableDocker || !this.docker) return

		try {
			const containerName = `microservice-${serviceId}`
			const container = this.docker.getContainer(containerName)
			const containerInfo = await container.inspect()
			
			const existing = this.containers.get(serviceId)
			if (existing) {
				// Update status based on actual Docker state
				if (containerInfo.State.Status === "running") {
					existing.status = "running"
					existing.endpoint = `http://localhost:3000/${serviceId}`
				} else if (containerInfo.State.Status === "exited") {
					existing.status = "stopped"
					existing.endpoint = null
				}
				this.containers.set(serviceId, existing)
			}
		} catch (err) {
			// Container doesn't exist, mark as stopped
			const existing = this.containers.get(serviceId)
			if (existing) {
				existing.status = "stopped"
				existing.endpoint = null
				this.containers.set(serviceId, existing)
			}
		}
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
		this.log.info("Starting container", { 
			serviceId: service.id, 
			enableDocker: this.enableDocker,
			port 
		})
		
		if (this.enableDocker) {
			this.log.info("Using Docker runtime")
			await this.buildAndRunDocker(service, port, info)
		} else {
			this.log.info("Using simulated runtime")
			await new Promise((r) => setTimeout(r, 200))
			// Standardize endpoint for all services to http://localhost:3000/{id}
			if (service.type === "roble" && service.tableName) {
				// Even when delegating to Roble, expose a local status/endpoint path
				const res = await robleClient.runService(service, service.robleToken || "")
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
			if (service.type === "roble" && service.tableName) env.push(`TABLE_NAME=${service.tableName}`)
			if (service.type === "roble" && service.robleProjectName) env.push(`ROBLE_PROJECT=${service.robleProjectName}`)
			if (service.type === "roble" && service.robleToken) env.push(`ROBLE_TOKEN=${service.robleToken}`)
			const created = await this.docker.createContainer({
				name: containerName,
				Image: `microservice-${service.id}:latest`,
				Env: env,
				ExposedPorts: { "3000/tcp": {} },
				HostConfig: {
					PortBindings: { "3000/tcp": [{ HostPort: `${port}` }] },
					NetworkMode: this.networkName,
					Binds: binds,
					RestartPolicy: { Name: "unless-stopped" }, // Keep container running unless manually stopped
				},
				NetworkingConfig: {},
			})

			await created.start()

			// Monitor container status and restart if it exits unexpectedly
			this.monitorContainer(service.id, created)

			info.status = "running"
			info.endpoint = `http://localhost:3000/${service.id}`
		} catch (err: any) {
			this.log.error("docker build/run failed", { err: err?.message || err, serviceId: service.id })
			info.status = "error"
			info.error = String(err?.message || err)
		}
	}

	private async monitorContainer(serviceId: string, container: any) {
		// Monitor container status every 5 seconds
		const checkStatus = async () => {
			try {
				const containerInfo = await container.inspect()
				if (containerInfo.State.Status === "exited") {
					this.log.info("Container exited, restarting", { serviceId })
					await container.start()
				}
			} catch (err: any) {
				// If container doesn't exist (404), stop monitoring
				if (err.statusCode === 404) {
					this.log.info("Container no longer exists, stopping monitoring", { serviceId })
					const interval = this.containerIntervals.get(serviceId)
					if (interval) {
						clearInterval(interval)
						this.containerIntervals.delete(serviceId)
					}
					return
				}
				this.log.error("Container monitoring error", { serviceId, err })
			}
		}

		// Check every 5 seconds
		const interval = setInterval(checkStatus, 5000)
		
		// Store interval ID for cleanup
		this.containerIntervals.set(serviceId, interval)
	}

	private async stopDockerContainer(serviceId: string) {
		this.log.info("[docker] stop", { serviceId })
		try {
			// Clear monitoring interval
			const interval = this.containerIntervals.get(serviceId)
			if (interval) {
				clearInterval(interval)
				this.containerIntervals.delete(serviceId)
			}

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
