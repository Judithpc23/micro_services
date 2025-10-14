"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Loader2, Save, X } from "lucide-react"
import type { Microservice } from "@/lib/types/microservice"
import type { ServiceLanguage, ServiceType } from "@/app/page"

interface CreateServiceFormProps {
  onCreateService: (service: Omit<Microservice, "id" | "createdAt">) => void
  editingService?: Microservice | null
  onUpdateService?: (id: string, service: Omit<Microservice, "id" | "createdAt">) => void
  onCancelEdit?: () => void
}

export function CreateServiceForm({
  onCreateService,
  editingService,
  onUpdateService,
  onCancelEdit,
}: CreateServiceFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [language, setLanguage] = useState<ServiceLanguage>("python")
  const [code, setCode] = useState("")
  const [type, setType] = useState<ServiceType>("execution")
  // UI field for Roble table name
  const [tableName, setTableName] = useState("")
  const [robleProjectName, setRobleProjectName] = useState("")
  const [robleToken, setRobleToken] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editingService) {
      setName(editingService.name)
      setDescription(editingService.description)
      setLanguage(editingService.language)
      setCode(editingService.code)
      setType(editingService.type)
  // Prefill table name if present
      setTableName(editingService.tableName || "")
      setRobleProjectName(editingService.robleProjectName || "")
      setRobleToken(editingService.robleToken || "")
    } else {
      // Reset form when not editing
      setName("")
      setDescription("")
      setCode("")
      setLanguage("python")
      setType("execution")
      setTableName("")
      setRobleProjectName("")
      setRobleToken("")
    }
  }, [editingService])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !description || !code) {
      return
    }

    // For Roble services, table name, project name, and token are required
    if (type === "roble" && (!tableName || !robleProjectName || !robleToken)) {
      return
    }

    setIsSubmitting(true)
    try {
      if (editingService && onUpdateService) {
        await onUpdateService(editingService.id, {
          name,
          description,
          language,
          code,
          type,
          tableName: type === "roble" ? tableName : undefined,
          robleProjectName: type === "roble" ? robleProjectName : undefined,
          robleToken: type === "roble" ? robleToken : undefined,
        })
      } else {
        await onCreateService({
          name,
          description,
          language,
          code,
          type,
          tableName: type === "roble" ? tableName : undefined,
          robleProjectName: type === "roble" ? robleProjectName : undefined,
          robleToken: type === "roble" ? robleToken : undefined,
        })
      }

      // Reset form only if creating (not editing)
      if (!editingService) {
        setName("")
        setDescription("")
        setCode("")
        setLanguage("python")
        setType("execution")
        setTableName("")
        setRobleProjectName("")
        setRobleToken("")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (onCancelEdit) {
      onCancelEdit()
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">{editingService ? "Edit Microservice" : "Create Microservice"}</CardTitle>
        <CardDescription>
          {editingService ? "Update your microservice configuration" : "Define your custom microservice configuration"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Service Name</Label>
            <Input
              id="name"
              placeholder="my-service"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={isSubmitting}
              className="bg-input border-border"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what your service does..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              disabled={isSubmitting}
              rows={2}
              className="bg-input border-border resize-none"
            />
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLanguage("python")}
                disabled={isSubmitting}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  language === "python"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-input text-muted-foreground hover:bg-secondary"
                }`}
              >
                Python
              </button>
              <button
                type="button"
                onClick={() => setLanguage("javascript")}
                disabled={isSubmitting}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  language === "javascript"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-input text-muted-foreground hover:bg-secondary"
                }`}
              >
                JavaScript
              </button>
            </div>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Service Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("execution")}
                disabled={isSubmitting}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  type === "execution"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-input text-muted-foreground hover:bg-secondary"
                }`}
              >
                Execution
              </button>
              <button
                type="button"
                onClick={() => setType("roble")}
                disabled={isSubmitting}
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                  type === "roble"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-input text-muted-foreground hover:bg-secondary"
                }`}
              >
                Roble
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {type === "roble" ? "Requires Roble table name, project and token" : "Standard execution"}
            </p>
          </div>

          {type === "roble" && (
            <div className="space-y-2">
              <Label htmlFor="tableName">Table Name</Label>
              <Input
                id="tableName"
                type="text"
                placeholder="Enter the Roble table name, e.g. microservices"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-input border-border font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                This will be used to target the table in Roble where records are managed
              </p>
            </div>
          )}

          {type === "roble" && (
            <div className="space-y-2">
              <Label htmlFor="robleProjectName">Roble Project Name</Label>
              <Input
                id="robleProjectName"
                type="text"
                placeholder="Enter the Roble project name"
                value={robleProjectName}
                onChange={(e) => setRobleProjectName(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-input border-border text-sm"
              />
              <p className="text-xs text-muted-foreground">Project/workspace name in Roble</p>
            </div>
          )}

          {type === "roble" && (
            <div className="space-y-2">
              <Label htmlFor="robleToken">Roble Token</Label>
              <Input
                id="robleToken"
                type="password"
                placeholder="Paste the Roble access token"
                value={robleToken}
                onChange={(e) => setRobleToken(e.target.value)}
                required
                disabled={isSubmitting}
                className="bg-input border-border font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">This token is used for Roble authorization</p>
            </div>
          )}

          {/* Code */}
          <div className="space-y-2">
            <Label htmlFor="code">Code</Label>
            <Textarea
              id="code"
              placeholder={
                language === "python"
                  ? 'def handler(event):\n    return {"message": "Hello World"}'
                  : 'function handler(event) {\n    return { message: "Hello World" };\n}'
              }
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              disabled={isSubmitting}
              rows={8}
              className="bg-input border-border font-mono text-sm resize-none"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {editingService ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  {editingService ? (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Update Service
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Service
                    </>
                  )}
                </>
              )}
            </Button>
            {editingService && onCancelEdit && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="border-border bg-transparent"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
