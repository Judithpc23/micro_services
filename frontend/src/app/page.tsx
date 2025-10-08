"use client"

import { useState } from "react"
import { CreateServiceForm } from "@/components/create-service-form"
import { ServiceCard } from "@/components/service-card"
import { Code2 } from "lucide-react"

export type ServiceType = "execution" | "roble"
export type ServiceLanguage = "python" | "javascript"

export interface Microservice {
  id: string
  name: string
  description: string
  language: ServiceLanguage
  code: string
  type: ServiceType
  createdAt: Date
  endpoint?: string
}

export default function Home() {
  const [services, setServices] = useState<Microservice[]>([])

  const handleCreateService = (service: Omit<Microservice, "id" | "createdAt">) => {
    const newService: Microservice = {
      ...service,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    }
    setServices([newService, ...services])
  }

  const handleDeleteService = (id: string) => {
    setServices(services.filter((s) => s.id !== id))
  }

  const handleEditService = (id: string) => {
    // TODO: Implement edit functionality
    console.log("[v0] Edit service:", id)
  }

  const handleExecuteService = (id: string) => {
    // TODO: Implement execution functionality
    console.log("[v0] Execute service:", id)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
              <Code2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-balance">Microservice Platform</h1>
              <p className="text-sm text-muted-foreground">Create and manage custom microservices</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          {/* Create Service Form */}
          <div>
            <CreateServiceForm onCreateService={handleCreateService} />
          </div>

          {/* Services Grid */}
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Your Microservices</h2>
              <p className="text-sm text-muted-foreground">
                {services.length} {services.length === 1 ? "service" : "services"} deployed
              </p>
            </div>

            {services.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/30 p-12 text-center">
                <Code2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">No microservices yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Create your first microservice using the form to get started
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {services.map((service) => (
                  <ServiceCard
                    key={service.id}
                    service={service}
                    onDelete={handleDeleteService}
                    onEdit={handleEditService}
                    onExecute={handleExecuteService}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
