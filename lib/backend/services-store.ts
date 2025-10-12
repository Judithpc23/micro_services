import type { Microservice } from "@/lib/types/microservice"
import { promises as fs } from "fs"
import path from "path"
import { createLogger } from "@/lib/backend/logger"
import { robleClient } from "@/lib/backend/roble-client"

// Simple in-memory store for microservices. In a real app, replace with a DB.
class ServicesStore {
	private store = new Map<string, Microservice>()
	private filePath: string
	private writeTimer: NodeJS.Timeout | null = null
	private writeIntervalMs = 400
	
	// Roble synchronization configuration
	private robleClient = robleClient
	private syncEnabled = process.env.SYNC_MICROSERVICES_TO_ROBLE === "true"

	constructor() {
		const dataDir = path.join(process.cwd(), ".data")
		this.filePath = path.join(dataDir, "services.json")
		// Fire and forget load
			this.init(dataDir).catch((e) => this.log.warn("init error", { error: String(e) }))
	}

	private async init(dir: string) {
		try {
			await fs.mkdir(dir, { recursive: true })
			const raw = await fs.readFile(this.filePath, "utf8").catch(() => "[]")
			const arr: any[] = JSON.parse(raw)
			arr.forEach((o) => {
				// revive dates
				if (o.createdAt) o.createdAt = new Date(o.createdAt)
				this.store.set(o.id, o as Microservice)
			})
				this.log.info(`Loaded ${arr.length} services from disk`)
		} catch (err) {
				this.log.warn("Failed to load store", { error: String(err) })
		}
	}

	private scheduleWrite() {
		if (this.writeTimer) clearTimeout(this.writeTimer)
		this.writeTimer = setTimeout(() => this.flush().catch(console.error), this.writeIntervalMs)
	}

	private async flush() {
		const data = JSON.stringify(Array.from(this.store.values()), null, 2)
		await fs.writeFile(this.filePath, data, "utf8")
			this.log.debug("flushed to disk", { count: this.store.size })
	}

		private log = createLogger("services-store")

	// ===== ROBLE SYNCHRONIZATION METHODS =====
	
	/**
	 * Mapear microservicio local al formato de Roble
	 */
	private mapToRobleFormat(service: Microservice, status: string = 'created'): any {
		return {
			_id: service.id,
			id: service.id,
			name: service.name,
			description: service.description,
			language: service.language,
			code: service.code,
			type: service.type,
			status: status,
			createAt: service.createdAt.toISOString(),
			updatedAt: new Date().toISOString()
		}
	}
	
	/**
	 * Obtener estado basado en la acción
	 */
	private getStatusFromAction(action: string): string {
		switch (action) {
			case 'create': return 'created'
			case 'update': return 'updated'
			case 'delete': return 'deleted'
			default: return 'unknown'
		}
	}
	
	/**
	 * Sincronizar creación con Roble
	 */
	private async syncCreateToRoble(service: Microservice): Promise<void> {
		if (!this.syncEnabled) return
		
		try {
			// Asegurar autenticación antes de la operación
			await this.ensureRobleAuth()
			
			const robleData = this.mapToRobleFormat(service, 'created')
			await this.robleClient.insertRecords('microservices', [robleData])
			this.log.info(`✅ Microservice ${service.id} created in Roble`)
		} catch (error) {
			this.log.error(`❌ Failed to create microservice ${service.id} in Roble:`, { error: String(error) })
		}
	}
	
	/**
	 * Sincronizar actualización con Roble
	 */
	private async syncUpdateToRoble(service: Microservice): Promise<void> {
		if (!this.syncEnabled) return
		
		try {
			// Asegurar autenticación antes de la operación
			await this.ensureRobleAuth()
			
			const robleData = this.mapToRobleFormat(service, 'updated')
			await this.robleClient.updateRecord('microservices', service.id, robleData)
			this.log.info(`✅ Microservice ${service.id} updated in Roble`)
		} catch (error) {
			this.log.error(`❌ Failed to update microservice ${service.id} in Roble:`, { error: String(error) })
		}
	}
	
	/**
	 * Sincronizar eliminación con Roble
	 */
	private async syncDeleteToRoble(serviceId: string): Promise<void> {
		if (!this.syncEnabled) return
		
		try {
			// Asegurar autenticación antes de la operación
			await this.ensureRobleAuth()
			
			await this.robleClient.deleteRecord('microservices', serviceId)
			this.log.info(`✅ Microservice ${serviceId} deleted from Roble`)
		} catch (error) {
			this.log.error(`❌ Failed to delete microservice ${serviceId} from Roble:`, { error: String(error) })
		}
	}
	
	/**
	 * Asegurar autenticación con Roble antes de operaciones
	 */
	private async ensureRobleAuth(): Promise<void> {
		try {
			this.log.info('🔍 Verificando autenticación con Roble...')
			
			// Verificar si ya está autenticado
			if (this.robleClient.isAuthenticated()) {
				this.log.info('✅ Ya autenticado con Roble')
				return
			}
			
			// Intentar login con credenciales de entorno
			const email = process.env.ROBLE_USER_EMAIL
			const password = process.env.ROBLE_USER_PASSWORD
			
			this.log.info('📋 Credenciales encontradas:', {
				email: email ? 'Configurado' : 'No configurado',
				password: password ? 'Configurado' : 'No configurado'
			})
			
			if (!email || !password) {
				this.log.warn('⚠️ Credenciales de Roble no configuradas')
				return
			}
			
			this.log.info('🔐 Autenticando con Roble...')
			const result = await this.robleClient.login(email, password)
			
			if (result.success) {
				this.log.info('✅ Autenticación con Roble exitosa')
			} else {
				this.log.error('❌ Error en autenticación con Roble:', { error: result.error })
			}
			
		} catch (error) {
			this.log.error('❌ Error asegurando autenticación con Roble:', { error: String(error) })
		}
	}
	
	// ===== PUBLIC METHODS FOR MANUAL SYNC =====
	
	/**
	 * Sincronizar todos los microservicios con Roble
	 */
	async syncAllToRoble(): Promise<{ success: number; failed: number }> {
		if (!this.syncEnabled) {
			this.log.warn('Roble sync is disabled. Set SYNC_MICROSERVICES_TO_ROBLE=true to enable.')
			return { success: 0, failed: 0 }
		}

		const services = await this.getAll()
		let success = 0
		let failed = 0

		for (const service of services) {
			try {
				await this.syncCreateToRoble(service)
				success++
			} catch (error) {
				failed++
				this.log.error(`Failed to sync service ${service.id}:`, { error: String(error) })
			}
		}

		this.log.info(`Sync completed: ${success} success, ${failed} failed`)
		return { success, failed }
	}
	
	/**
	 * Verificar estado de sincronización
	 */
	getSyncStatus(): { enabled: boolean; robleConnected: boolean } {
		return {
			enabled: this.syncEnabled,
			robleConnected: !!this.robleClient
		}
	}

	async getAll(): Promise<Microservice[]> {
		try {
			const raw = await fs.readFile(this.filePath, "utf8").catch(() => "[]")
			const arr: any[] = JSON.parse(raw)
			arr.forEach((o) => {
				if (o.createdAt) o.createdAt = new Date(o.createdAt)
			})
			return arr as Microservice[]
		} catch (err) {
			this.log.warn("Failed to read services from disk", { error: String(err) })
			return []
		}
	}

	getById(id: string): Microservice | undefined {
		return this.store.get(id)
	}

	create(service: Microservice): Microservice {
		// Guardar localmente
		this.store.set(service.id, service)
		this.scheduleWrite()
		
		// Sincronizar con Roble (asíncrono, no bloquea)
		this.syncCreateToRoble(service).catch(error => {
			this.log.warn(`Failed to sync create for ${service.id}:`, error)
		})
		
		return service
	}

	update(id: string, updates: Partial<Omit<Microservice, "id" | "createdAt">>): Microservice | null {
		const existing = this.store.get(id)
		if (!existing) return null
		
		// Actualizar localmente
		const updated: Microservice = { ...existing, ...updates }
		this.store.set(id, updated)
		this.scheduleWrite()
		
		// Sincronizar con Roble (asíncrono, no bloquea)
		this.syncUpdateToRoble(updated).catch(error => {
			this.log.warn(`Failed to sync update for ${id}:`, error)
		})
		
		return updated
	}

	delete(id: string): boolean {
		const res = this.store.delete(id)
		if (res) {
			this.scheduleWrite()
			
			// Sincronizar con Roble (asíncrono, no bloquea)
			this.syncDeleteToRoble(id).catch(error => {
				this.log.warn(`Failed to sync delete for ${id}:`, error)
			})
		}
		return res
	}
}
// Persist instance across HMR in Next.js dev
declare global {
	// eslint-disable-next-line no-var
	var __servicesStore: ServicesStore | undefined
}

export const servicesStore: ServicesStore = globalThis.__servicesStore ?? new ServicesStore()
if (!globalThis.__servicesStore) globalThis.__servicesStore = servicesStore
