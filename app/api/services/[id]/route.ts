import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { validateServiceCode } from "@/lib/backend/code-validator"

// GET /api/services/[id] - Get a single service
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const service = servicesStore.getById(id)

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    return NextResponse.json(service)
  } catch (error) {
    console.error("[v0] Error fetching service:", error)
    return NextResponse.json({ error: "Failed to fetch service" }, { status: 500 })
  }
}

// PUT /api/services/[id] - Update a service
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const body = await request.json()
  const { name, description, language, code, type, tokenDatabase } = body

    // Validation
    if (name !== undefined && typeof name !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 })
    }
    if (description !== undefined && typeof description !== "string") {
      return NextResponse.json({ error: "Invalid description" }, { status: 400 })
    }
    if (code !== undefined && typeof code !== "string") {
      return NextResponse.json({ error: "Invalid code" }, { status: 400 })
    }
    if (language !== undefined && !["python", "javascript"].includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 })
    }
    if (type !== undefined && !["execution", "roble"].includes(type)) {
      return NextResponse.json({ error: "Invalid service type" }, { status: 400 })
    }
    if (type === "roble" && tokenDatabase !== undefined && typeof tokenDatabase !== "string") {
      return NextResponse.json({ error: "Invalid database token" }, { status: 400 })
    }

    // If code or language is being updated, re-validate for unsafe patterns
    if (code !== undefined || language !== undefined) {
      const lang = (language as any) || servicesStore.getById(id)?.language
      if (lang && code) {
        const validation = validateServiceCode({ language: lang, code })
        if (!validation.valid) {
          return NextResponse.json(
            { error: "Unsafe code detected", reasons: validation.reasons },
            { status: 400 },
          )
        }
      }
    }

    const updates: Partial<{
      name: string
      description: string
      language: "python" | "javascript"
      code: string
      type: "execution" | "roble"
      tokenDatabase?: string
    }> = {}

    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
  if (language !== undefined) updates.language = language as "python" | "javascript"
    if (code !== undefined) updates.code = code
  if (type !== undefined) updates.type = type as "execution" | "roble"
  if (tokenDatabase !== undefined) updates.tokenDatabase = tokenDatabase

    const updatedService = servicesStore.update(id, updates)

    if (!updatedService) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    return NextResponse.json(updatedService)
  } catch (error) {
    console.error("[v0] Error updating service:", error)
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 })
  }
}

// DELETE /api/services/[id] - Delete a service
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const deleted = servicesStore.delete(id)

    if (!deleted) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting service:", error)
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 })
  }
}
