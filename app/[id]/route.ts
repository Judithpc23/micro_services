import { NextRequest, NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"

// GET /[id] - Proxy endpoint for microservices
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params
    const service = servicesStore.getById(id)

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 })
    }

    const containerInfo = containerManager.getContainerInfo(id)
    
    if (!containerInfo || containerInfo.status !== "running") {
      return NextResponse.json({ 
        error: "Service is not running", 
        status: containerInfo?.status || "stopped" 
      }, { status: 503 })
    }

    // Get the internal port from container info
    const internalPort = containerInfo.port
    if (!internalPort) {
      return NextResponse.json({ error: "Service port not available" }, { status: 503 })
    }

    // Forward request to the actual container
    const url = new URL(request.url)
    let targetPath = url.pathname.replace(`/${id}`, '') || '/'
    
    // If accessing root path, redirect to /execute to run the custom code
    if (targetPath === '/') {
      targetPath = '/execute'
    }
    
    const targetUrl = `http://localhost:${internalPort}${targetPath}`
    
    console.log(`Proxying request to: ${targetUrl}`)
    
    try {
      // If redirecting to /execute, always use POST method
      const method = targetPath === '/execute' ? 'POST' : request.method
      const body = targetPath === '/execute' ? '{}' : (request.method !== 'GET' ? await request.text() : undefined)
      
      const response = await fetch(targetUrl, {
        method: method,
        headers: {
          'Content-Type': request.headers.get('content-type') || 'application/json',
        },
        body: body,
      })

      const data = await response.text()
      
      return new NextResponse(data, {
        status: response.status,
        headers: {
          'Content-Type': response.headers.get('content-type') || 'application/json',
        },
      })
    } catch (error) {
      console.error(`Proxy error for service ${id}:`, error)
      return NextResponse.json({ 
        error: "Failed to connect to service", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, { status: 502 })
    }
  } catch (error) {
    console.error("Proxy endpoint error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /[id] - Handle POST requests to microservices
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  return GET(request, { params })
}

// PUT /[id] - Handle PUT requests to microservices  
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  return GET(request, { params })
}

// DELETE /[id] - Handle DELETE requests to microservices
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  return GET(request, { params })
}