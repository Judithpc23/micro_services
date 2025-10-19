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
import { RobleTableSelector } from "@/components/roble-table-selector"

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
  
  // Roble configuration states
  const [robleMode, setRobleMode] = useState<"current" | "different">("different")
  const [robleContract, setRobleContract] = useState("")
  const [robleEmail, setRobleEmail] = useState("")
  const [roblePassword, setRoblePassword] = useState("")
  const [robleToken, setRobleToken] = useState("")
  const [authMethod, setAuthMethod] = useState<"token" | "credentials">("token")
  const [selectedTable, setSelectedTable] = useState("")
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editingService) {
      setName(editingService.name)
      setDescription(editingService.description)
      setLanguage(editingService.language)
      setCode(editingService.code)
      setType(editingService.type)
      // Prefill Roble fields if present
  setRobleMode(editingService.robleMode === "current" ? "current" : "different")
      setRobleContract(editingService.robleContract || "")
      setRobleEmail(editingService.robleEmail || "")
      setRoblePassword(editingService.roblePassword || "")
      setRobleToken(editingService.robleToken || "")
      setSelectedTable(editingService.tableName || "")
    } else {
      // Reset form when not editing
      setName("")
      setDescription("")
      setCode("")
      setLanguage("python")
      setType("execution")
  setRobleMode("different")
      setRobleContract("")
      setRobleEmail("")
      setRoblePassword("")
      setRobleToken("")
      setSelectedTable("")
    }
  }, [editingService])

  // Force python when switching to Roble and set default code
  useEffect(() => {
    if (type === "roble") {
      // Always enforce Python for Roble services
      if (language !== "python") {
        setLanguage("python")
      }
      if (!editingService) {
        setCode(`# Roble Microservice - Python
# This service can interact with your Roble database

def main():
    # Example: Read all records from the table
    records = read_data()
    print(f"Found {len(records)} records")
    
    # Process the records as needed
    for record in records:
        print(f"Record ID: {record.get('_id')}")
        print(f"Data: {record}")
    
    return {
        "message": "Roble microservice executed successfully",
        "records_count": len(records),
        "status": "completed"
    }

# Available helper functions:
# - read_data(filters=None): Read records from the table
# - insert_data(records): Insert new records
# - update_data(record_id, updates): Update a specific record
# - delete_data(record_id): Delete a specific record`)
      } else {
        setCode(`// Roble Microservice - JavaScript
// This service can interact with your Roble database

async function main() {
    try {
        // Example: Read all records from the table
        const records = await readData();
        console.log(\`Found \${records.length} records\`);
        
        // Process the records as needed
        for (const record of records) {
            console.log(\`Record ID: \${record._id}\`);
            console.log('Data:', record);
        }
        
        return {
            message: 'Roble microservice executed successfully',
            recordsCount: records.length,
            status: 'completed'
        };
    } catch (error) {
        console.error('Error in microservice:', error);
        return {
            message: 'Error executing microservice',
            error: error.message,
            status: 'error'
        };
    }
}

// Available helper functions:
// - readData(filters): Read records from the table
// - insertData(records): Insert new records  
// - updateData(recordId, updates): Update a specific record
// - deleteData(recordId): Delete a specific record`)
      }
    }
  }, [type, language, editingService])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !description || !code) {
      return
    }

    // For Roble services, validate based on mode
    if (type === "roble") {
      if (!selectedTable) {
        return
      }
      
      if (robleMode === "different") {
        if (!robleContract) {
          return
        }
        
        if (authMethod === "token" && !robleToken) {
          return
        }
        
        if (authMethod === "credentials" && (!robleEmail || !roblePassword)) {
          return
        }
      }
    }

    setIsSubmitting(true)
    try {
      const serviceData = {
        name,
        description,
        language,
        code,
        type,
        tableName: type === "roble" ? selectedTable : undefined,
        robleMode: type === "roble" ? robleMode : undefined,
        robleContract: type === "roble" && robleMode === "different" ? robleContract : undefined,
        robleEmail: type === "roble" && robleMode === "different" && authMethod === "credentials" ? robleEmail : undefined,
        roblePassword: type === "roble" && robleMode === "different" && authMethod === "credentials" ? roblePassword : undefined,
        robleToken: type === "roble" && robleMode === "different" && authMethod === "token" ? robleToken : undefined,
      }

      if (editingService && onUpdateService) {
        await onUpdateService(editingService.id, serviceData)
      } else {
        await onCreateService(serviceData)
      }

      // Reset form only if creating (not editing)
      if (!editingService) {
        setName("")
        setDescription("")
        setCode("")
        setLanguage("python")
        setType("execution")
        setRobleMode("current")
        setRobleContract("")
        setRobleEmail("")
        setRoblePassword("")
        setRobleToken("")
        setSelectedTable("")
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
            </div>
            <p className="text-xs text-muted-foreground">Actualmente solo está disponible Python para nuevos microservicios.</p>
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
            <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium text-sm">Roble Configuration</h4>
              
              {robleMode === "current" ? (
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
                    This service uses the project-level Roble credentials defined in your environment variables.
                    Update the service to switch to a custom project.
                  </div>
                  <RobleTableSelector
                    onTableSelect={setSelectedTable}
                    selectedTable={selectedTable}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Contract */}
                  <div className="space-y-2">
                    <Label htmlFor="robleContract">Roble Contract/DB Name</Label>
                    <Input
                      id="robleContract"
                      placeholder="token_contract_xyz"
                      value={robleContract}
                      onChange={(e) => setRobleContract(e.target.value)}
                      required
                      disabled={isSubmitting}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Database/contract identifier in Roble
                    </p>
                  </div>

                  {/* Método de Autenticación */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Authentication Method</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setAuthMethod("token")}
                        disabled={isSubmitting}
                        className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                          authMethod === "token"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-input text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        Access Token
                      </button>
                      <button
                        type="button"
                        onClick={() => setAuthMethod("credentials")}
                        disabled={isSubmitting}
                        className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                          authMethod === "credentials"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-input text-muted-foreground hover:bg-secondary"
                        }`}
                      >
                        Email/Password
                      </button>
                    </div>
                  </div>

                  {/* Autenticación por Token */}
                  {authMethod === "token" && (
                    <div className="space-y-2">
                      <Label htmlFor="robleToken">Roble Access Token</Label>
                      <Input
                        id="robleToken"
                        type="password"
                        placeholder="Paste the Roble access token"
                        value={robleToken}
                        onChange={(e) => setRobleToken(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Token for Roble authentication
                      </p>
                    </div>
                  )}

                  {/* Autenticación por Credenciales */}
                  {authMethod === "credentials" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="robleEmail">Roble Email</Label>
                        <Input
                          id="robleEmail"
                          type="email"
                          placeholder="user@uninorte.edu.co"
                          value={robleEmail}
                          onChange={(e) => setRobleEmail(e.target.value)}
                          required
                          disabled={isSubmitting}
                          className="font-mono text-sm"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="roblePassword">Roble Password</Label>
                        <Input
                          id="roblePassword"
                          type="password"
                          placeholder="Your Roble password"
                          value={roblePassword}
                          onChange={(e) => setRoblePassword(e.target.value)}
                          required
                          disabled={isSubmitting}
                          className="font-mono text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Selector de Tablas para Proyecto Diferente */}
                  <RobleTableSelector
                    onTableSelect={setSelectedTable}
                    selectedTable={selectedTable}
                  />
                </div>
              )}
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
              className={`bg-input border-border font-mono text-sm resize-none ${
                type === "roble" && !editingService ? "text-muted-foreground" : ""
              }`}
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
