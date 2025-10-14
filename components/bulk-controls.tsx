"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Play, Square, Loader2, RefreshCw } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface BulkControlsProps {
  onServicesUpdate?: () => void
}

export function BulkControls({ onServicesUpdate }: BulkControlsProps) {
  const [isStarting, setIsStarting] = useState(false)
  const [isStopping, setIsStopping] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  const handleStartAll = async () => {
    setIsStarting(true)
    try {
      const response = await fetch("/api/services/bulk/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "✅ Services Started",
          description: `Successfully started ${data.services.length} microservices`,
        })
        // Update services state without page reload
        onServicesUpdate?.()
      } else {
        toast({
          title: "❌ Start Failed",
          description: data.message || "Failed to start services",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Start Failed",
        description: "Network error while starting services",
        variant: "destructive"
      })
    } finally {
      setIsStarting(false)
    }
  }

  const handleStopAll = async () => {
    setIsStopping(true)
    try {
      const response = await fetch("/api/services/bulk/stop", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "🛑 Services Stopped",
          description: `Successfully stopped ${data.services.length} microservices`,
        })
        // Update services state without page reload
        onServicesUpdate?.()
      } else {
        toast({
          title: "❌ Stop Failed",
          description: data.message || "Failed to stop services",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Stop Failed",
        description: "Network error while stopping services",
        variant: "destructive"
      })
    } finally {
      setIsStopping(false)
    }
  }

  const handleSyncAll = async () => {
    setIsSyncing(true)
    try {
      const response = await fetch("/api/services/bulk/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "🔄 Containers Synced",
          description: "Container states synchronized with Docker",
        })
        // Update services state without page reload
        onServicesUpdate?.()
      } else {
        toast({
          title: "❌ Sync Failed",
          description: data.message || "Failed to sync containers",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "❌ Sync Failed",
        description: "Network error while syncing containers",
        variant: "destructive"
      })
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex gap-2 p-4 bg-muted/50 rounded-lg border">
      <div className="flex-1">
        <h3 className="font-semibold text-sm text-muted-foreground mb-1">
          Bulk Operations
        </h3>
        <p className="text-xs text-muted-foreground">
          Control all microservices at once using Docker Compose
        </p>
      </div>
      
      <div className="flex gap-2">
        <Button
          onClick={handleStartAll}
          disabled={isStarting || isStopping || isSyncing}
          size="sm"
          className="bg-green-600 hover:bg-green-700"
        >
          {isStarting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Play className="w-4 h-4 mr-2" />
          )}
          Start All
        </Button>
        
        <Button
          onClick={handleStopAll}
          disabled={isStarting || isStopping || isSyncing}
          size="sm"
          variant="destructive"
        >
          {isStopping ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Square className="w-4 h-4 mr-2" />
          )}
          Stop All
        </Button>
        
        <Button
          onClick={handleSyncAll}
          disabled={isStarting || isStopping || isSyncing}
          size="sm"
          variant="outline"
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Sync
        </Button>
      </div>
    </div>
  )
}
