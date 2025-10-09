import type { Microservice } from "@/lib/types/microservice"

export interface RobleRunResult {
  jobId: string
  statusUrl: string
  endpoint?: string
}

export interface RobleStatus {
  jobId: string
  state: "pending" | "running" | "completed" | "failed" | "stopped"
  endpoint?: string
  error?: string
}

interface FetchOptions {
  method?: string
  body?: any
  token?: string | null
  expected?: number | number[]
}

function toArray<T>(v: T | T[] | undefined): T[] | undefined {
  if (v === undefined) return undefined
  return Array.isArray(v) ? v : [v]
}

class HttpError extends Error {
  status: number
  detail: any
  constructor(status: number, message: string, detail?: any) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

export class RobleClient {
  // Base URL of the real Roble API. Change via ROBLE_API_BASE env.
  private base = process.env.ROBLE_API_BASE || "https://roble.openlab.uninorte.edu.co"
  // Abort requests after this timeout (ms). ROBLE_API_TIMEOUT env override.
  private timeout = Number(process.env.ROBLE_API_TIMEOUT || 10000)
  // Feature flag: when false (default) we DO NOT call remote Roble, we return stub data.
  // Enable by setting ENABLE_ROBLE_REMOTE=true
  private remoteEnabled = process.env.ENABLE_ROBLE_REMOTE === "true"
  // Local base used for stub endpoints / status references.
  private localBase = process.env.ROBLE_LOCAL_BASE_URL || "http://localhost:3000"

  // Public API
  async runService(service: Microservice, token: string): Promise<RobleRunResult> {
    // In stub mode we simply synthesize a job id and point status to local service status
    if (!this.remoteEnabled) {
      return this.runServiceStub(service)
    }
    // Placeholder real call: crear un "job" remoto
    const job = await this.fetchJson<{
      jobId: string
      endpoint?: string
      state?: string
    }>(`/api/jobs`, {
      method: "POST",
      token: token || service.tokenDatabase || null,
      body: {
        language: service.language,
        code: service.code,
        name: service.name,
        description: service.description,
      },
      expected: [200, 201],
    })
    const jobId = job.jobId || `unknown-${Date.now()}`
    return {
      jobId,
      statusUrl: `${this.base}/api/jobs/${jobId}`,
      endpoint: job.endpoint,
    }
  }

  async getStatus(jobId: string, token: string): Promise<RobleStatus> {
    // Stub: always 'running' with local endpoint
    if (!this.remoteEnabled) return this.getStatusStub(jobId)
    const data = await this.fetchJson<any>(`/api/jobs/${jobId}`, {
      method: "GET",
      token,
      expected: 200,
    })
    return {
      jobId,
      state: (data.state as RobleStatus["state"]) || "running",
      endpoint: data.endpoint,
      error: data.error,
    }
  }

  async stopService(jobId: string, token: string): Promise<void> {
    if (!this.remoteEnabled) return
    await this.fetchJson(`/api/jobs/${jobId}/stop`, {
      method: "POST",
      token,
      expected: [200, 202, 204],
    })
  }

  // ===== Internal helpers =====
  private async fetchJson<T = any>(path: string, opts: FetchOptions): Promise<T> {
    const url = `${this.base}${path}`
    const controller = new AbortController()
    const t = setTimeout(() => controller.abort(), this.timeout)
    try {
      const res = await fetch(url, {
        method: opts.method || "GET",
        headers: {
          "Content-Type": "application/json",
          ...(opts.token || process.env.ROBLE_API_TOKEN
            ? { Authorization: `Bearer ${opts.token || process.env.ROBLE_API_TOKEN}` }
            : {}),
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      })
      const expected = toArray(opts.expected) || [200]
      if (!expected.includes(res.status)) {
        let detail: any = null
        try { detail = await res.json() } catch { /* ignore */ }
        throw new HttpError(res.status, `Roble request failed (${res.status})`, detail)
      }
      // No content
      if (res.status === 204) return undefined as any
      return (await res.json()) as T
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new HttpError(504, "Roble request timeout")
      }
      throw err
    } finally {
      clearTimeout(t)
    }
  }

  // ===== Stubs (modo local) =====
  private runServiceStub(service: Microservice): RobleRunResult {
    // Local development stub: emulate a remote job creation.
    // We don't persist job state here; container-manager tracks running state.
    const jobId = `stub-${service.id}-${Date.now()}`
    return {
      jobId,
      // Point status and endpoint to the standardized local service path
      statusUrl: `${this.localBase}/${service.id}/status`,
      endpoint: `${this.localBase}/${service.id}`,
    }
  }

  private getStatusStub(jobId: string): RobleStatus {
    // Always report running for simplicity; extend as needed.
    // Try to extract service id from stub jobId format `stub-{serviceId}-{ts}`
    const parts = jobId.split("-")
    const serviceId = parts.length >= 3 ? parts.slice(1, parts.length - 1).join("-") : undefined
    const endpoint = serviceId ? `${this.localBase}/${serviceId}` : `${this.localBase}`
    return { jobId, state: "running", endpoint }
  }
}

export const robleClient = new RobleClient()