"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Terminal,
  Play,
  CheckCircle2,
  XCircle,
  Server,
  Network
} from "lucide-react"
import { ServiceStatusIndicator } from "@/components/service-status-indicator"
import { APIClient, type JobStatus } from "@/lib/api-client"

export function MisconfigChecker() {
  const [domain, setDomain] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [status, setStatus] = useState<string>("")
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const [stats, setStats] = useState({ critical: 0, high: 0, exploitable: 0 })

  // Connection check (handled by ServiceStatusIndicator)


  const startScan = async () => {
    if (!domain) return

    setIsLoading(true)
    setStatus("Starting scan...")
    setStats({ critical: 0, high: 0, exploitable: 0 })
    setJobStatus(null)
    setActiveTab("logs") // Auto-switch to logs on start

    try {
      const client = new APIClient("/api/gateway/misconfig-checker")
      const response = await client.submitScan({ domain })

      if (response.success && response.job_id) {
        setStatus("Scan in progress...")
        pollResults(client, response.job_id)
      } else {
        setIsLoading(false)
        setStatus("Failed to start scan")
      }
    } catch (error) {
      console.error("Error starting scan:", error)
      setIsLoading(false)
      setStatus("Error occurred")
    }
  }

  const pollResults = (client: APIClient, jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const result = await client.getJobStatus(jobId)

        if (result.success && result.data) {
          const data = result.data as JobStatus
          setJobStatus(data)

          const scanResults = data.scan_results
          if (scanResults) {
            setStats({
              critical: scanResults.critical_count || 0,
              high: scanResults.high_count || 0,
              exploitable: scanResults.exploitable_count || 0
            })
          }

          if (data.status === "completed" || data.status === "failed") {
            clearInterval(pollInterval)
            setIsLoading(false)
            setStatus(data.status === "completed" ? "Scan complete" : "Scan failed")
            if (data.status === "completed") {
              setActiveTab("overview") // Switch back to overview on success
            }
          } else {
            setStatus(`Scanning... ${data.status}`)
          }
        }
      } catch (e) {
        console.error("Polling error:", e)
      }
    }, 2000)
  }

  // Extract services from NMAP execution history
  const getDetectedServices = () => {
    if (!jobStatus?.execution_history) return []

    const services: string[] = []
    jobStatus.execution_history.forEach((exec: any) => {
      if (exec.agent === 'nmap' && exec.structured_data?.detected_services) {
        services.push(...exec.structured_data.detected_services)
      }
    })
    return [...new Set(services)] // Remove duplicates
  }

  const detectedServices = getDetectedServices()

  return (
    <div className="space-y-6 h-full flex flex-col">
      <ServiceStatusIndicator
        url="/api/gateway/misconfig-checker/api/health"
        serviceName="Misconfig Checker"
        variant="alert"
        checkInterval={30000}
        onStatusChange={(online) => setIsConnected(online)}
      />

      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-primary" />
              Misconfig Checker
            </h1>
            <p className="text-muted-foreground">Comprehensive security scanning and misconfiguration detection</p>
          </div>
        </div>

        <div className="flex gap-4 items-center bg-card p-4 rounded-lg border border-border">
          <Input
            placeholder="Enter target domain or IP (e.g. scanme.nmap.org)"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="flex-1"
          />
          <Button onClick={startScan} disabled={isLoading || !isConnected || !domain}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
            {isLoading ? "Start Scan" : "Run New Scan"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-500">{stats.critical}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">High Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{stats.high}</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Exploitable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">{stats.exploitable}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="services">Services <Badge variant="secondary" className="ml-2 text-[10px]">{detectedServices.length}</Badge></TabsTrigger>
              <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger>
              <TabsTrigger value="logs">Execution Log</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">

          <div className="h-[500px] p-6">

            {activeTab === "overview" && (
              <ScrollArea className="h-full pr-4">
                {jobStatus?.scan_results?.analysis || jobStatus?.scan_results?.response ? (
                  <div className="prose dark:prose-invert max-w-none">
                    <div className="p-4 bg-muted/30 rounded-lg border border-border mb-4">
                      <h3 className="text-lg font-semibold mb-2">Scan Summary</h3>
                      <div className="whitespace-pre-wrap font-sans text-sm">
                        {jobStatus.scan_results.response || jobStatus.scan_results.analysis}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ShieldCheck size={48} className="mb-4 opacity-20" />
                    <p>No scan results available yet.</p>
                  </div>
                )}
              </ScrollArea>
            )}

            {activeTab === "services" && (
              <ScrollArea className="h-full pr-4">
                {detectedServices.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Service</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detectedServices.map((service, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <Network size={16} className="text-blue-500" />
                              <span className="capitalize">{service.split(' ')[0] || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs">{service}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <Server size={48} className="mb-4 opacity-20" />
                    <p>No open services detected yet.</p>
                  </div>
                )}
              </ScrollArea>
            )}

            {activeTab === "vulnerabilities" && (
              <ScrollArea className="h-full pr-4">
                {jobStatus?.scan_results?.vulnerabilities?.vulnerability_details?.length ? (
                  <div className="space-y-2">
                    {jobStatus.scan_results.vulnerabilities.vulnerability_details.map((vuln: string, i: number) => (
                      <Alert key={i} variant="default" className="border-l-4 border-l-red-500">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        <AlertTitle className="text-sm font-semibold">Vulnerability Detected</AlertTitle>
                        <AlertDescription className="text-xs font-mono mt-1">
                          {vuln}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <ShieldCheck size={48} className="mb-4 opacity-20" />
                    <p>No vulnerabilities detected.</p>
                  </div>
                )}
              </ScrollArea>
            )}

            {activeTab === "logs" && (
              <ScrollArea className="h-full bg-black/90 text-green-400 p-4 rounded-md font-mono text-xs">
                {jobStatus?.execution_history && jobStatus.execution_history.length > 0 ? (
                  <div className="space-y-4">
                    {jobStatus.execution_history.map((exec: any, i: number) => (
                      <div key={i} className="border-b border-green-900/30 pb-2">
                        <div className="flex items-center gap-2 mb-1 text-green-300">
                          <Terminal size={12} />
                          <span className="font-bold">[{exec.agent.toUpperCase()}]</span>
                          <span className="opacity-70">Step {exec.step || i + 1}</span>
                        </div>
                        <div className="pl-5 text-green-400/80 font-bold">
                          {exec.task}
                        </div>
                        <div className="pl-5 mt-1 text-green-500/50">
                          &gt; Execution successful
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="opacity-50">
                    {jobStatus?.status === "running" ? "Waiting for execution logs..." : "No execution logs available"}
                  </div>
                )}
              </ScrollArea>
            )}

          </div>
        </CardContent>
      </Card>
    </div>
  )
}
