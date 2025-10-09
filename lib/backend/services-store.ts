import type { Microservice } from "@/lib/types/microservice"
import { promises as fs } from "fs"
import path from "path"
import { createLogger } from "@/lib/backend/logger"

// Simple in-memory store for microservices. In a real app, replace with a DB.
class ServicesStore {
	private store = new Map<string, Microservice>()
	private filePath: string
	private writeTimer: NodeJS.Timeout | null = null
	private writeIntervalMs = 400

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

	getAll(): Microservice[] {
		return Array.from(this.store.values()).sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		)
	}

	getById(id: string): Microservice | undefined {
		return this.store.get(id)
	}

	create(service: Microservice): Microservice {
		this.store.set(service.id, service)
		this.scheduleWrite()
		return service
	}

	update(id: string, updates: Partial<Omit<Microservice, "id" | "createdAt">>): Microservice | null {
		const existing = this.store.get(id)
		if (!existing) return null
		const updated: Microservice = { ...existing, ...updates }
		this.store.set(id, updated)
		this.scheduleWrite()
		return updated
	}

	delete(id: string): boolean {
		const res = this.store.delete(id)
		if (res) this.scheduleWrite()
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
