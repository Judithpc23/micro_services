"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileCode, Copy, Check } from "lucide-react"

interface DockerfileViewerProps {
  serviceId: string
  serviceName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DockerfileViewer({ serviceId, serviceName, open, onOpenChange }: DockerfileViewerProps) {
  const [files, setFiles] = useState<{
    dockerfile: string
    code: string
    dependencies: string
    language: string
    dockerCompose?: string
    startScript?: string
    stopScript?: string
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [copiedTab, setCopiedTab] = useState<string | null>(null)

  const fetchDockerfile = async () => {
    setLoading(true)
    try {
      const [dockerfileResponse, composeResponse] = await Promise.all([
        fetch(`/api/services/${serviceId}/dockerfile`),
        fetch(`/api/services/${serviceId}/compose`),
      ])

      const dockerfileResult = await dockerfileResponse.json()
      const composeResult = await composeResponse.json()

      if (dockerfileResult.success) {
        setFiles({
          ...dockerfileResult.data,
          dockerCompose: composeResult.dockerCompose,
          startScript: composeResult.startScript,
          stopScript: composeResult.stopScript,
        })
      }
    } catch (error) {
      console.error("Error fetching Dockerfile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (newOpen && !files) {
      fetchDockerfile()
    }
  }

  // Ensure we fetch files if the dialog is opened programmatically by parent
  useEffect(() => {
    if (open && !files) fetchDockerfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const copyToClipboard = async (text: string, tab: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedTab(tab)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" />
            Docker Configuration - {serviceName}
          </DialogTitle>
          <DialogDescription>
            Complete Docker setup including Dockerfile, Docker Compose, and deployment scripts
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading files...</div>
          </div>
        ) : files ? (
          <Tabs defaultValue="dockerfile" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="dockerfile">Dockerfile</TabsTrigger>
              <TabsTrigger value="compose">Compose</TabsTrigger>
              <TabsTrigger value="code">{files.language === "python" ? "main.py" : "index.js"}</TabsTrigger>
              <TabsTrigger value="dependencies">
                {files.language === "python" ? "requirements.txt" : "package.json"}
              </TabsTrigger>
              <TabsTrigger value="scripts">Scripts</TabsTrigger>
            </TabsList>

            <TabsContent value="dockerfile" className="flex-1 overflow-hidden flex flex-col mt-0">
              <div className="flex justify-end mb-2">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(files.dockerfile, "dockerfile")}>
                  {copiedTab === "dockerfile" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copiedTab === "dockerfile" ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="flex-1 overflow-auto rounded-md bg-input border border-border p-4">
                <pre className="text-sm font-mono">
                  <code>{files.dockerfile}</code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="compose" className="flex-1 overflow-hidden flex flex-col mt-0">
              <div className="flex justify-end mb-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(files.dockerCompose || "", "compose")}
                >
                  {copiedTab === "compose" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copiedTab === "compose" ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="flex-1 overflow-auto rounded-md bg-input border border-border p-4">
                <pre className="text-sm font-mono">
                  <code>{files.dockerCompose}</code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="code" className="flex-1 overflow-hidden flex flex-col mt-0">
              <div className="flex justify-end mb-2">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(files.code, "code")}>
                  {copiedTab === "code" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copiedTab === "code" ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="flex-1 overflow-auto rounded-md bg-input border border-border p-4">
                <pre className="text-sm font-mono">
                  <code>{files.code}</code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="dependencies" className="flex-1 overflow-hidden flex flex-col mt-0">
              <div className="flex justify-end mb-2">
                <Button size="sm" variant="outline" onClick={() => copyToClipboard(files.dependencies, "dependencies")}>
                  {copiedTab === "dependencies" ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  {copiedTab === "dependencies" ? "Copied!" : "Copy"}
                </Button>
              </div>
              <div className="flex-1 overflow-auto rounded-md bg-input border border-border p-4">
                <pre className="text-sm font-mono">
                  <code>{files.dependencies}</code>
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="scripts" className="flex-1 overflow-hidden flex flex-col mt-0 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">start.sh</h4>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(files.startScript || "", "start")}>
                    {copiedTab === "start" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedTab === "start" ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="overflow-auto rounded-md bg-input border border-border p-4">
                  <pre className="text-sm font-mono">
                    <code>{files.startScript}</code>
                  </pre>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">stop.sh</h4>
                  <Button size="sm" variant="outline" onClick={() => copyToClipboard(files.stopScript || "", "stop")}>
                    {copiedTab === "stop" ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                    {copiedTab === "stop" ? "Copied!" : "Copy"}
                  </Button>
                </div>
                <div className="overflow-auto rounded-md bg-input border border-border p-4">
                  <pre className="text-sm font-mono">
                    <code>{files.stopScript}</code>
                  </pre>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
