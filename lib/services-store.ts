import type { Microservice } from "@/lib/types/microservice"

class ServicesStore {
  private services: Map<string, Microservice> = new Map()

  getAll(): Microservice[] {
    return Array.from(this.services.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  getById(id: string): Microservice | undefined {
    return this.services.get(id)
  }

  create(service: Microservice): Microservice {
    this.services.set(service.id, service)
    return service
  }

  update(id: string, updates: Partial<Microservice>): Microservice | null {
    const service = this.services.get(id)
    if (!service) return null

    const updatedService = { ...service, ...updates, id, createdAt: service.createdAt }
    this.services.set(id, updatedService)
    return updatedService
  }

  delete(id: string): boolean {
    return this.services.delete(id)
  }
}

// Singleton instance
export const servicesStore = new ServicesStore()
