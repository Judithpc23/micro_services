import { NextResponse } from "next/server"
import { containerManager } from "@/lib/backend/container-manager"
import { servicesStore } from "@/lib/backend/services-store"

// Dynamic proxy: forwards requests from /{id}/* to the corresponding container
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params
  return proxyRequest(request, id)
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params
  return proxyRequest(request, id)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params
  return proxyRequest(request, id)
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const { id } = await params
  return proxyRequest(request, id)
}

async function proxyRequest(request: Request, id: string) {
  // Ensure service is running (try to start it if missing)
  let containerInfo = containerManager.getContainerInfo(id)
  if (!containerInfo || containerInfo.status !== "running" || !containerInfo.port) {
    // try to find service and start container
    const service = servicesStore.getById(id)
    if (!service) return NextResponse.json({ error: "Service not found" }, { status: 404 })
    try {
      await containerManager.startContainer(service)
    } catch (e) {
      return NextResponse.json({ error: "Failed to start service", detail: String(e) }, { status: 500 })
    }

    // wait up to 5s for container info to be available
    const start = Date.now()
    while (Date.now() - start < 5000) {
      containerInfo = containerManager.getContainerInfo(id)
      if (containerInfo && containerInfo.status === "running" && containerInfo.port) break
      await new Promise((r) => setTimeout(r, 200))
    }

    if (!containerInfo || containerInfo.status !== "running" || !containerInfo.port) {
      return NextResponse.json({ error: "Service not running after start" }, { status: 504 })
    }
  }

  const target = `http://localhost:3000/${id}`

  //console.log(`Proxying request to service ${id} at ${target}`)

  // Forward request
  const headers: Record<string, string> = {}
  request.headers.forEach((v, k) => (headers[k] = v))

  const body = request.method === "GET" || request.method === "HEAD" ? null : await request.arrayBuffer()

  const resp = await fetch(target, { method: request.method, headers, body: body ? Buffer.from(body) : undefined })

  const respHeaders: Record<string, string> = {}
  resp.headers.forEach((v, k) => (respHeaders[k] = v))

  const respBody = await resp.arrayBuffer()

  return new NextResponse(Buffer.from(respBody), { status: resp.status, headers: respHeaders })
}
