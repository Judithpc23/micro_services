"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Edit2, Play, Trash2, Lock, FileCode, Square, ExternalLink, Activity, TerminalSquare } from "lucide-react"
import type { Microservice } from "@/lib/types/microservice"
import { DockerfileViewer } from "./dockerfile-viewer"
import { InvokeServiceDialog } from "./invoke-service-dialog"
import type { ContainerStatus } from "@/lib/backend/container-manager"

interface ServiceCardProps {
  service: Microservice
  onDelete: (id: string) => void
  onEdit: (id: string) => void
  onExecute: (id: string) => void
}

interface ContainerInfo {
  status: ContainerStatus
  endpoint: string | null
  port: number | null
  startedAt: string | null
}

export function ServiceCard({ service, onDelete, onEdit, onExecute }: ServiceCardProps) {
  const [showDockerfile, setShowDockerfile] = useState(false)
  const [containerInfo, setContainerInfo] = useState<ContainerInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showInvoke, setShowInvoke] = useState(false)

  const languageColors = {
    python: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    javascript: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(fetchStatus, 3000)
    return () => clearInterval(interval)
  }, [service.id])

  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/services/${service.id}/status`)
      if (response.ok) {
        const data = await response.json()
        setContainerInfo(data.container)
      }
    } catch (error) {
      console.error("Failed to fetch status:", error)
    }
  }

  const handleStop = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/services/${service.id}/stop`, {
        method: "POST",
      })

      if (response.ok) {
        // Immediately fetch the updated status
        await fetchStatus()
      }
    } catch (error) {
      console.error("Failed to stop service:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecute = async () => {
    setIsLoading(true)
    try {
      onExecute(service.id)
      // Wait a bit for the container to start, then fetch status
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await fetchStatus()
    } catch (error) {
      console.error("Failed to execute service:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = () => {
    if (!containerInfo) return null

    const statusConfig = {
      stopped: { color: "bg-gray-500/10 text-gray-400 border-gray-500/20", label: "Stopped" },
      starting: { color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", label: "Starting..." },
      running: { color: "bg-green-500/10 text-green-400 border-green-500/20", label: "Running" },
      error: { color: "bg-red-500/10 text-red-400 border-red-500/20", label: "Error" },
    }

    const config = statusConfig[containerInfo.status]

    return (
      <Badge variant="outline" className={config.color}>
        <Activity className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const isTransitioning = containerInfo?.status === "starting"
  const isRunning = containerInfo?.status === "running"
  const isStopped = !containerInfo || containerInfo.status === "stopped" || containerInfo.status === "error"

  return (
    <>
      <Card className="border-border bg-card hover:border-primary/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base truncate">{service.name}</CardTitle>
              <CardDescription className="text-xs mt-1 line-clamp-2">{service.description}</CardDescription>
            </div>
            {service.type === "roble" && <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={languageColors[service.language]}>
              {service.language}
            </Badge>
            <Badge variant="outline" className="border-border text-muted-foreground">
              {service.type}
            </Badge>
            {getStatusBadge()}
          </div>

          {isRunning && containerInfo.endpoint && (
            <div className="rounded-md bg-primary/5 border border-primary/20 p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Endpoint:</p>
                  <code className="text-xs font-mono text-primary truncate block">{containerInfo.endpoint}</code>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 flex-shrink-0"
                  onClick={() => window.open(containerInfo.endpoint!, "_blank")}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Code Preview */}
          <div className="rounded-md bg-input border border-border p-2">
            <pre className="text-xs font-mono text-muted-foreground overflow-hidden">
              <code className="line-clamp-3">{service.code}</code>
            </pre>
          </div>

          <div className="flex gap-2">
            {isRunning ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleStop}
                disabled={isLoading || isTransitioning}
                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 bg-transparent"
              >
                <Square className="h-3 w-3 mr-1" />
                {isLoading ? "Stopping..." : "Stop"}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={handleExecute}
                disabled={isLoading || isTransitioning}
                className="flex-1 border-primary/30 text-primary hover:bg-primary/10 bg-transparent"
              >
                <Play className="h-3 w-3 mr-1" />
                {isLoading || isTransitioning ? "Starting..." : "Execute"}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDockerfile(true)}
              className="border-border hover:bg-secondary"
              title="View Dockerfile"
            >
              <FileCode className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(service.id)}
              disabled={isRunning || isTransitioning}
              className="border-border hover:bg-secondary disabled:opacity-50"
              title={isRunning || isTransitioning ? "Stop the service before editing" : "Edit service"}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowInvoke(true)}
              className="border-border hover:bg-secondary"
              title="Probar microservicio"
            >
              <TerminalSquare className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(service.id)}
              disabled={isRunning || isTransitioning}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-50"
              title={isRunning || isTransitioning ? "Stop the service before deleting" : "Delete service"}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            Created {service.createdAt.toLocaleDateString()}
            {containerInfo?.startedAt && (
              <span className="ml-2">• Started {new Date(containerInfo.startedAt).toLocaleTimeString()}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <DockerfileViewer
        serviceId={service.id}
        serviceName={service.name}
        open={showDockerfile}
        onOpenChange={setShowDockerfile}
      />
      <InvokeServiceDialog serviceId={service.id} open={showInvoke} onOpenChange={setShowInvoke} />
    </>
  )
}
