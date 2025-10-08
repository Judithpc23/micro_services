"use client"

import { useState, useEffect } from "react"
import { CreateServiceForm } from "@/components/create-service-form"
import { ServiceCard } from "@/components/service-card"
import { Code2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { Microservice } from "@/lib/types/microservice"

export type ServiceType = "execution" | "roble"
export type ServiceLanguage = "python" | "javascript"

export default function Home() {
  const [services, setServices] = useState<Microservice[]>([])
  const [loading, setLoading] = useState(true)
  const [editingService, setEditingService] = useState<Microservice | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const response = await fetch("/api/services")
      if (!response.ok) throw new Error("Failed to fetch services")
      const data = await response.json()
      // Convert date strings to Date objects
      const servicesWithDates = data.map((s: Microservice) => ({
        ...s,
        createdAt: new Date(s.createdAt),
      }))
      setServices(servicesWithDates)
    } catch (error) {
      console.error("[v0] Error fetching services:", error)
      toast({
        title: "Error",
        description: "Failed to load services",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCreateService = async (service: Omit<Microservice, "id" | "createdAt">) => {
    try {
      const response = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(service),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create service")
      }

      const newService = await response.json()
      setServices([{ ...newService, createdAt: new Date(newService.createdAt) }, ...services])
      toast({
        title: "Success",
        description: `Service "${newService.name}" created successfully`,
      })
    } catch (error) {
      console.error("[v0] Error creating service:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create service",
        variant: "destructive",
      })
    }
  }

  const handleUpdateService = async (id: string, service: Omit<Microservice, "id" | "createdAt">) => {
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(service),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update service")
      }

      const updatedService = await response.json()
      setServices(
        services.map((s) => (s.id === id ? { ...updatedService, createdAt: new Date(updatedService.createdAt) } : s)),
      )
      setEditingService(null)
      toast({
        title: "Success",
        description: `Service "${updatedService.name}" updated successfully`,
      })
    } catch (error) {
      console.error("[v0] Error updating service:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update service",
        variant: "destructive",
      })
    }
  }

  const handleDeleteService = async (id: string) => {
    try {
      const response = await fetch(`/api/services/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete service")

      setServices(services.filter((s) => s.id !== id))
      if (editingService?.id === id) {
        setEditingService(null)
      }
      toast({
        title: "Success",
        description: "Service deleted successfully",
      })
    } catch (error) {
      console.error("[v0] Error deleting service:", error)
      toast({
        title: "Error",
        description: "Failed to delete service",
        variant: "destructive",
      })
    }
  }

  const handleEditService = (id: string) => {
    const service = services.find((s) => s.id === id)
    if (service) {
      setEditingService(service)
      // Scroll to form
      window.scrollTo({ top: 0, behavior: "smooth" })
    }
  }

  const handleCancelEdit = () => {
    setEditingService(null)
  }

  const handleExecuteService = async (id: string) => {
    try {
      const response = await fetch(`/api/services/${id}/execute`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to execute service")

      const result = await response.json()
      toast({
        title: "Execution Started",
        description: result.message,
      })
    } catch (error) {
      console.error("[v0] Error executing service:", error)
      toast({
        title: "Error",
        description: "Failed to execute service",
        variant: "destructive",
      })
    }
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
            <CreateServiceForm
              onCreateService={handleCreateService}
              editingService={editingService}
              onUpdateService={handleUpdateService}
              onCancelEdit={handleCancelEdit}
            />
          </div>

          {/* Services Grid */}
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-2">Your Microservices</h2>
              <p className="text-sm text-muted-foreground">
                {loading
                  ? "Loading..."
                  : `${services.length} ${services.length === 1 ? "service" : "services"} deployed`}
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center rounded-lg border border-border bg-card/30 p-12">
                <div className="text-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Loading services...</p>
                </div>
              </div>
            ) : services.length === 0 ? (
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
