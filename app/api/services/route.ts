import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import type { Microservice } from "@/lib/types/microservice"
import { validateServiceCode } from "@/lib/backend/code-validator"

// GET /api/services - Get all services
export async function GET() {
  try {
    const services = servicesStore.getAll()
    return NextResponse.json(services)
  } catch (error) {
    console.error("[v0] Error fetching services:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}

// POST /api/services - Create a new service
export async function POST(request: Request) {
  try {
    const body = await request.json()
  const { name, description, language, code, type, tokenDatabase } = body

    // Validation
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (!description || typeof description !== "string") {
      return NextResponse.json({ error: "Description is required" }, { status: 400 })
    }
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code is required" }, { status: 400 })
    }
    if (!["python", "javascript"].includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 })
    }
    if (!["execution", "roble"].includes(type)) {
      return NextResponse.json({ error: "Invalid service type" }, { status: 400 })
    }
    if (type === "roble" && (!tokenDatabase || typeof tokenDatabase !== "string")) {
      return NextResponse.json({ error: "Database token is required for Roble services" }, { status: 400 })
    }

    // Unsafe code validation
    const validation = validateServiceCode({ language, code })
    if (!validation.valid) {
      return NextResponse.json({ error: "Unsafe code detected", reasons: validation.reasons }, { status: 400 })
    }

    // Create service
    const newService: Microservice = {
      id: crypto.randomUUID(),
      name,
      description,
      language: language as any,
      code,
      type: type as any,
      tokenDatabase: type === "roble" ? tokenDatabase : undefined,
      createdAt: new Date(),
    }

    const createdService = servicesStore.create(newService)
    return NextResponse.json(createdService, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating service:", error)
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 })
  }
}
