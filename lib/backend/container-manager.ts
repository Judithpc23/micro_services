import type { Microservice } from "@/lib/types/microservice"
import { robleClient } from "@/lib/backend/roble-client"
import { createLogger } from "@/lib/backend/logger"
import { generateServiceFiles } from "@/lib/docker/dockerfile-generator"
import * as fs from "fs/promises"
import * as path from "path"
import { spawn } from "child_process"

export type ContainerStatus = "starting" | "running" | "stopped" | "error"

export interface ContainerInfo {
	serviceId: string
	status: ContainerStatus
	endpoint: string | null
	port: number | null
	startedAt: string | null
	stoppedAt: string | null
	error: string | null
	process?: any // Child process for cleanup
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
		const containerInfo = this.containers.get(serviceId)
		
		// If no container info exists, return a default stopped state
		if (!containerInfo) {
			return {
				serviceId,
				status: "stopped",
				endpoint: null,
				port: null,
				startedAt: null,
				stoppedAt: null,
				error: null,
			}
		}
		
		return containerInfo
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
				// For Roble services, we need to start the actual generated server
				// even in simulated mode, because the server contains the Roble integration
				this.log.info("🚀 Iniciando servidor Roble generado...")
				
				// Generate and save the service files
				const files = generateServiceFiles(service)
				const serviceDir = path.join(process.cwd(), "services", `service-${service.id}`)
				await fs.mkdir(serviceDir, { recursive: true })
				
				// Always regenerate the files to ensure they are up to date
				this.log.info("🔄 Regenerando archivos del servidor...")
				
				// Variables de entorno se pasan via docker-compose env_file
				
				if (service.language === "python") {
					await fs.writeFile(path.join(serviceDir, "main.py"), files.code, "utf8")
					await fs.writeFile(path.join(serviceDir, "requirements.txt"), files.dependencies, "utf8")
					this.log.info("✅ Archivos Python regenerados")
					
					// Start the Python server on a different port
					const servicePort = 3000 + parseInt(service.id.slice(-4), 16) % 1000 + 1000
					this.log.info(`🐍 Ejecutando servidor Python en puerto ${servicePort}...`)
					
					// Prepare environment variables for Roble services
					const envVars: any = { 
						...process.env, 
						PORT: servicePort.toString(),
						// Variables específicas del servicio (no sensibles)
						TABLE_NAME: service.tableName || 'microservices',
						SERVICE_NAME: service.name,
						SERVICE_TYPE: service.type
					}

					// Add Roble-specific credentials based on mode
					if (service.type === "roble") {
						envVars.ROBLE_MODE = service.robleMode || 'current'
						
						if (service.robleMode === 'different') {
							// Use form credentials for different project mode
							if (service.robleContract) {
								envVars.ROBLE_SERVICE_CONTRACT = service.robleContract
							}
							if (service.robleEmail) {
								envVars.ROBLE_SERVICE_EMAIL = service.robleEmail
							}
							if (service.roblePassword) {
								envVars.ROBLE_SERVICE_PASSWORD = service.roblePassword
							}
							if (service.robleToken) {
								envVars.ROBLE_SERVICE_TOKEN = service.robleToken
							}
						}
						// For 'current' mode, the generated server will use standard env vars
					}

					// Start the server process
					const serverProcess = spawn('python', ['main.py'], {
						cwd: serviceDir,
						env: envVars,
						detached: false
					}) as any
					
					// Store the process for cleanup
					this.containers.set(service.id, {
						...info,
						status: "running",
						endpoint: `http://localhost:${servicePort}`,
						port: servicePort,
						process: serverProcess
					})
					
					serverProcess.on('error', (error: any) => {
						this.log.error(`❌ Error ejecutando servidor Python:`, error)
					})
					
					serverProcess.on('exit', (code: any) => {
						this.log.info(`🔚 Servidor Python terminado con código ${code}`)
					})
					
					// Wait a bit for the server to start
					await new Promise((r) => setTimeout(r, 1000))
					
					this.log.info("✅ Servidor Roble ejecutándose")
					info.status = "running"
					info.endpoint = `http://localhost:${servicePort}`
					info.port = servicePort
				} else {
					await fs.writeFile(path.join(serviceDir, "index.js"), files.code, "utf8")
					await fs.writeFile(path.join(serviceDir, "package.json"), files.dependencies, "utf8")
					this.log.info("✅ Archivos JavaScript regenerados")
					
					// Start the Node.js server on a different port
					const servicePort = 3000 + parseInt(service.id.slice(-4), 16) % 1000 + 1000
					this.log.info(`🟢 Ejecutando servidor Node.js en puerto ${servicePort}...`)
					
					// Prepare environment variables for Roble services
					const envVars: any = { 
						...process.env, 
						PORT: servicePort.toString(),
						// Variables específicas del servicio (no sensibles)
						TABLE_NAME: service.tableName || 'microservices',
						SERVICE_NAME: service.name,
						SERVICE_TYPE: service.type
					}

					// Add Roble-specific credentials based on mode
					if (service.type === "roble") {
						envVars.ROBLE_MODE = service.robleMode || 'current'
						
						if (service.robleMode === 'different') {
							// Use form credentials for different project mode
							if (service.robleContract) {
								envVars.ROBLE_SERVICE_CONTRACT = service.robleContract
							}
							if (service.robleEmail) {
								envVars.ROBLE_SERVICE_EMAIL = service.robleEmail
							}
							if (service.roblePassword) {
								envVars.ROBLE_SERVICE_PASSWORD = service.roblePassword
							}
							if (service.robleToken) {
								envVars.ROBLE_SERVICE_TOKEN = service.robleToken
							}
						}
						// For 'current' mode, the generated server will use standard env vars
					}

					// Start the server process
					const serverProcess = spawn('node', ['index.js'], {
						cwd: serviceDir,
						env: envVars,
						detached: false
					}) as any
					
					// Store the process for cleanup
					this.containers.set(service.id, {
						...info,
						status: "running",
						endpoint: `http://localhost:${servicePort}`,
						port: servicePort,
						process: serverProcess
					})
					
					serverProcess.on('error', (error: any) => {
						this.log.error(`❌ Error ejecutando servidor Node.js:`, error)
					})
					
					serverProcess.on('exit', (code: any) => {
						this.log.info(`🔚 Servidor Node.js terminado con código ${code}`)
					})
					
					// Wait a bit for the server to start
					await new Promise((r) => setTimeout(r, 1000))
					
					this.log.info("✅ Servidor Roble ejecutándose")
					info.status = "running"
					info.endpoint = `http://localhost:${servicePort}`
					info.port = servicePort
				}
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
			
			// Guardar archivos físicos también en modo Docker para que se puedan ver
			const serviceDir = path.join(process.cwd(), "services", `service-${service.id}`)
			await fs.mkdir(serviceDir, { recursive: true })
			
			if (service.language === "python") {
				await fs.writeFile(path.join(serviceDir, "main.py"), files.code, "utf8")
				await fs.writeFile(path.join(serviceDir, "requirements.txt"), files.dependencies, "utf8")
			} else {
				await fs.writeFile(path.join(serviceDir, "index.js"), files.code, "utf8")
				await fs.writeFile(path.join(serviceDir, "package.json"), files.dependencies, "utf8")
			}
			
			this.log.info("✅ Archivos físicos guardados para modo Docker")
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

			// Load environment variables from .env
			const envVars = await this.loadEnvFile()

			// Add service-specific variables (these override .env if duplicated)
			if (service.type === "roble") {
				if (service.tableName) envVars["TABLE_NAME"] = service.tableName
				// Always pass ROBLE_MODE so generated server selects the correct source
				envVars["ROBLE_MODE"] = service.robleMode || 'current'

				if (service.robleMode === 'different') {
					// Use form-provided credentials exclusively for 'different' mode
					if (service.robleContract) envVars["ROBLE_SERVICE_CONTRACT"] = service.robleContract
					if (service.robleEmail) envVars["ROBLE_SERVICE_EMAIL"] = service.robleEmail
					if (service.roblePassword) envVars["ROBLE_SERVICE_PASSWORD"] = service.roblePassword
					if (service.robleToken) envVars["ROBLE_SERVICE_TOKEN"] = service.robleToken
				} else {
					// Current project mode: optional overrides if provided
					if (service.robleContract) envVars["ROBLE_CONTRACT"] = service.robleContract
					if (service.robleToken) envVars["ROBLE_TOKEN"] = service.robleToken
				}
			}

			// Convert to Docker env format: ["KEY=value", ...]
			const env = Object.entries(envVars).map(([key, value]) => `${key}=${value}`)
			
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
	
	/**
	 * Limpiar contenedores huérfanos que no están en el estado interno
	 */
	async cleanupOrphanedContainers(): Promise<void> {
		if (!this.docker) return
		
		try {
			this.log.info("🧹 Limpiando contenedores huérfanos...")
			
			// Obtener todos los contenedores microservice
			const containers = await this.docker.listContainers({ all: true })
			const microserviceContainers = containers.filter((c: any) => 
				c.Names.some((name: string) => name.includes('microservice-'))
			)
			
			// Obtener IDs de servicios activos
			const activeServiceIds = Array.from(this.containers.keys())
			
			// Encontrar contenedores huérfanos
			const orphanedContainers = microserviceContainers.filter((c: any) => {
				const containerName = c.Names[0].replace('/', '')
				const serviceId = containerName.replace('microservice-', '')
				return !activeServiceIds.includes(serviceId)
			})
			
			if (orphanedContainers.length > 0) {
				this.log.info(`🗑️ Encontrados ${orphanedContainers.length} contenedores huérfanos`)
				
				for (const container of orphanedContainers) {
					try {
						const containerObj = this.docker.getContainer(container.Id)
						await containerObj.stop()
						await containerObj.remove()
						this.log.info(`✅ Contenedor huérfano eliminado: ${container.Names[0]}`)
					} catch (error) {
						this.log.warn(`⚠️ Error eliminando contenedor huérfano ${container.Names[0]}:`, { error: String(error) })
					}
				}
			} else {
				this.log.info("✅ No se encontraron contenedores huérfanos")
			}
			
		} catch (error) {
			this.log.error("❌ Error limpiando contenedores huérfanos:", { error: String(error) })
		}
	}
	
	private async loadEnvFile(): Promise<Record<string, string>> {
		const envPath = path.join(process.cwd(), ".env")
		const envVars: Record<string, string> = {}
		
		try {
		  const content = await fs.readFile(envPath, "utf8")
		  const lines = content.split('\n')
		  
		  for (const line of lines) {
			const trimmed = line.trim()
			if (!trimmed || trimmed.startsWith('#')) continue
			
			const match = trimmed.match(/^([^=]+)=(.*)$/)
			if (match) {
			  const key = match[1].trim()
			  let value = match[2].trim()
			  // Remove quotes if present
			  if ((value.startsWith('"') && value.endsWith('"')) || 
				  (value.startsWith("'") && value.endsWith("'"))) {
				value = value.slice(1, -1)
			  }
			  envVars[key] = value
			}
		  }
		} catch (err) {
		  this.log.warn("Could not load .env file", { err })
		}
		
		return envVars
	  }
	// Función createServiceEnvFile eliminada - las variables se pasan via env_file en docker-compose
}

export const containerManager = new ContainerManager()
// Persist across HMR in dev
declare global {
	// eslint-disable-next-line no-var
	var __containerManager: ContainerManager | undefined
}

;(globalThis as any).__containerManager ??= containerManager
