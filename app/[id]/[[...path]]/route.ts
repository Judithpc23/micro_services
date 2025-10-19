import { NextRequest, NextResponse } from "next/server"
import { servicesStore } from "@/lib/backend/services-store"
import { containerManager } from "@/lib/backend/container-manager"

// GET /[id] - Proxy endpoint for microservices
export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string; path?: string[] } }
) {
  try {
    const { id, path } = await params
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

    const targetPath = path && path.length > 0 ? `/${path.join('/')}` : '/execute'
    const url = new URL(request.url)

    const method = targetPath === '/execute' ? 'POST' : request.method
    const hasBody = !['GET', 'HEAD'].includes(method)
    const requestBody = targetPath === '/execute' && method === 'POST'
      ? '{}'
      : hasBody
        ? await request.text()
        : undefined

    const forwardHeaders = new Headers(request.headers)
    forwardHeaders.delete('host')
    if (!requestBody) {
      forwardHeaders.delete('content-type')
    } else if (!forwardHeaders.get('content-type')) {
      forwardHeaders.set('content-type', 'application/json')
    }

  const attempts: string[] = []
  const envVars = ((globalThis as any).process?.env ?? {}) as Record<string, string | undefined>
  const isDockerRuntime = envVars.ENABLE_DOCKER_RUNTIME === 'true'
  const internalPort = containerInfo.port

    if (isDockerRuntime) {
      attempts.push(`http://microservice-${id}:3000`)
      if (internalPort) {
        attempts.push(`http://127.0.0.1:${internalPort}`)
        attempts.push(`http://host.docker.internal:${internalPort}`)
      }
    } else if (internalPort) {
      attempts.push(`http://127.0.0.1:${internalPort}`)
      attempts.push(`http://localhost:${internalPort}`)
    }

    if (attempts.length === 0) {
      return NextResponse.json({ error: "Service port not available" }, { status: 503 })
    }

    for (const baseUrl of Array.from(new Set(attempts))) {
      const targetUrl = `${baseUrl}${targetPath}${url.search}`
      console.log(`Proxying request to: ${targetUrl}`)

      try {
        const response = await fetch(targetUrl, {
          method,
          headers: forwardHeaders,
          body: requestBody,
        })

        const data = await response.text()
        const responseHeaders = new Headers()
        const contentType = response.headers.get('content-type') || (response.ok ? 'application/json' : null)
        if (contentType) {
          responseHeaders.set('content-type', contentType)
        }

        return new NextResponse(data, {
          status: response.status,
          headers: responseHeaders,
        })
      } catch (error) {
        console.error(`Proxy error for service ${id} using ${baseUrl}:`, error)
      }
    }

    return NextResponse.json({
      error: "Failed to connect to service",
      details: `Unable to reach service on: ${attempts.join(', ')}`,
    }, { status: 502 })
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