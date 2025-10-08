"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Plus } from "lucide-react"
import type { Microservice, ServiceLanguage, ServiceType } from "../pages/Home"

interface CreateServiceFormProps {
  onCreateService: (service: Omit<Microservice, "id" | "createdAt">) => void
}

export function CreateServiceForm({ onCreateService }: CreateServiceFormProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [language, setLanguage] = useState<ServiceLanguage>("python")
  const [code, setCode] = useState("")
  const [type, setType] = useState<ServiceType>("execution")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name || !description || !code) {
      return
    }

    onCreateService({
      name,
      description,
      language,
      code,
      type,
    })

    // Reset form
    setName("")
    setDescription("")
    setCode("")
    setLanguage("python")
    setType("execution")
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg">Create Microservice</CardTitle>
        <CardDescription>Define your custom microservice configuration</CardDescription>
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
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
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
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
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
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
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
                className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  type === "roble"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-input text-muted-foreground hover:bg-secondary"
                }`}
              >
                Roble
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              {type === "roble" ? "Requires authentication token" : "Standard execution"}
            </p>
          </div>

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
              rows={8}
              className="bg-input border-border font-mono text-sm resize-none"
            />
          </div>

          {/* Submit */}
          <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Create Service
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
