import { NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import type { Microservice } from "@/lib/types/microservice"
import { validateServiceCode } from "@/lib/backend/code-validator"

// GET /api/services - Get all services
export async function GET() {
  try {
    const services = await servicesStore.getAll()
    return NextResponse.json(services)
  } catch (error) {
    console.error("Error fetching services:", error)
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 })
  }
}

// POST /api/services - Create a new service
export async function POST(request: Request) {
  try {
    const body = await request.json()
  const { name, description, language, code, type, tableName, robleContract, robleEmail, roblePassword, robleToken, robleMode } = body

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
    // Require tableName for Roble.
    if (type === "roble") {
      if (!tableName || typeof tableName !== "string") {
        return NextResponse.json({ error: "Table name is required for Roble services" }, { status: 400 })
      }
      
      // Validate based on robleMode
      if (robleMode === "different") {
        if (!robleContract || typeof robleContract !== "string") {
          return NextResponse.json({ error: "Roble contract is required for different project mode" }, { status: 400 })
        }
        
        // Require either token OR (email + password)
        const hasToken = robleToken && typeof robleToken === "string"
        const hasCredentials = robleEmail && typeof robleEmail === "string" && roblePassword && typeof roblePassword === "string"
        
        if (!hasToken && !hasCredentials) {
          return NextResponse.json({ error: "Either Roble token or email/password is required for different project mode" }, { status: 400 })
        }
      }
    }

    // Unsafe code validation
    const validation = validateServiceCode({ language, code, serviceType: type })
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
      tableName: type === "roble" ? tableName : undefined,
      robleContract: type === "roble" ? robleContract : undefined,
      robleEmail: type === "roble" ? robleEmail : undefined,
      roblePassword: type === "roble" ? roblePassword : undefined,
      robleToken: type === "roble" ? robleToken : undefined,
      robleMode: type === "roble" ? robleMode : undefined,
      createdAt: new Date(),
    }

    const createdService = servicesStore.create(newService)
    return NextResponse.json(createdService, { status: 201 })
  } catch (error) {
    console.error("Error creating service:", error)
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 })
  }
}
