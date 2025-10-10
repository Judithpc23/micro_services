import { type NextRequest, NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { generateServiceFiles } from "@/lib/docker/dockerfile-generator"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const service = servicesStore.getById(id)

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    const files = generateServiceFiles(service)

    return NextResponse.json({
      success: true,
      data: {
        dockerfile: files.dockerfile,
        code: files.code,
        dependencies: files.dependencies,
        language: service.language,
      },
    })
  } catch (error) {
    console.error("Error generating Dockerfile:", error)
    return NextResponse.json({ error: "Failed to generate Dockerfile" }, { status: 500 })
  }
}
