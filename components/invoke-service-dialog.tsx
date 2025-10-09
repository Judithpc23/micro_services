"use client"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  serviceId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function InvokeServiceDialog({ serviceId, open, onOpenChange }: Props) {
  const [token, setToken] = useState("")
  const [params, setParams] = useState("{}")
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInvoke = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      let parsed: any = {}
      try { parsed = JSON.parse(params || "{}")} catch { setError("Params JSON inválido"); setLoading(false); return }
      const res = await fetch(`/api/services/${serviceId}/invoke`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Invoke failed")
      setResult(json)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Probar microservicio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium">Token (Authorization)</label>
            <Input value={token} onChange={(e) => setToken(e.target.value)} placeholder="Bearer token opcional" />
          </div>
          <div>
            <label className="text-xs font-medium">Parámetros (JSON)</label>
            <Textarea rows={4} value={params} onChange={(e) => setParams(e.target.value)} className="font-mono text-xs" />
          </div>
          <Button disabled={loading} onClick={handleInvoke} className="w-full">
            {loading ? "Invocando..." : "Invocar"}
          </Button>
          {error && <div className="text-xs text-red-500 whitespace-pre-wrap">{error}</div>}
          {result && (
            <pre className="text-xs bg-muted p-2 rounded max-h-48 overflow-auto whitespace-pre-wrap">
{JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}