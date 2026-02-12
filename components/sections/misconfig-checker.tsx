"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Server,
  Network,
  ArrowLeft
} from "lucide-react"
import { ServiceStatusIndicator } from "@/components/service-status-indicator"
import { APIClient, type JobStatus, type JobSummary, type PaginatedJobsResponse } from "@/lib/api-client"

export function MisconfigChecker() {
  const [domain, setDomain] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState<boolean | null>(null)
  const [status, setStatus] = useState<string>("")
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [activeTab, setActiveTab] = useState("results")
  const [stats, setStats] = useState({ critical: 0, high: 0, exploitable: 0 })

  const [viewMode, setViewMode] = useState<"list" | "detail">("list")
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)

  const [jobs, setJobs] = useState<JobSummary[]>([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [jobsError, setJobsError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(0)
  const [totalJobs, setTotalJobs] = useState(0)

  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [domainSearch, setDomainSearch] = useState("")

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Connection check (handled by ServiceStatusIndicator)

  const loadJobs = async (page: number = currentPage) => {
    setJobsLoading(true)
    setJobsError(null)

    try {
      const client = new APIClient(String(process.env.NEXT_PUBLIC_MISCONFIG_CHECKER_API))

      const filters: any = {
        page,
        page_size: pageSize,
      }

      if (statusFilter !== "all") {
        filters.status = statusFilter
      }

      if (domainSearch.trim()) {
        filters.domain_search = domainSearch.trim()
      }

      const result = await client.listJobs(filters)

      if (result.success && result.data) {
        const data = result.data as PaginatedJobsResponse
        setJobs(data.jobs)
        setCurrentPage(data.page)
        setTotalPages(data.total_pages)
        setTotalJobs(data.total)
      } else {
        setJobsError(result.error || "Failed to load jobs")
      }
    } catch (error) {
      console.error("Error loading jobs:", error)
      setJobsError(String(error))
    } finally {
      setJobsLoading(false)
    }
  }

  useEffect(() => {
    loadJobs()
  }, [statusFilter, pageSize])

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
      }
    }
  }, [])


  const startScan = async () => {
    if (!domain) return

    setIsLoading(true)
    setStatus("Starting scan...")
    setStats({ critical: 0, high: 0, exploitable: 0 })
    setJobStatus(null)
    setActiveTab("logs") // Auto-switch to logs on start

    try {
      const client = new APIClient(String(process.env.NEXT_PUBLIC_MISCONFIG_CHECKER_API))
      const response = await client.submitScan({ domain })

      if (response.success && response.job_id) {
        setSelectedJobId(response.job_id)
        setViewMode("detail")
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
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    const interval = setInterval(async () => {
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
            clearInterval(interval)
            pollIntervalRef.current = null
            setIsLoading(false)
            setStatus(data.status === "completed" ? "Scan complete" : "Scan failed")
            if (data.status === "completed") {
              setActiveTab("results") // Switch back to results on success
            }
          } else {
            setStatus(`Scanning... ${data.status}`)
          }
        }
      } catch (e) {
        console.error("Polling error:", e)
      }
    }, 2000)

    pollIntervalRef.current = interval
  }

  const handleJobSelect = async (job: JobSummary) => {
    setSelectedJobId(job.job_id)
    setViewMode("detail")
    setJobStatus(null)
    setStats({ critical: 0, high: 0, exploitable: 0 })

    const client = new APIClient(String(process.env.NEXT_PUBLIC_MISCONFIG_CHECKER_API))
    const result = await client.getJobStatus(job.job_id)

    if (result.success && result.data) {
      const data = result.data as JobStatus
      setJobStatus(data)

      if (data.scan_results) {
        setStats({
          critical: data.scan_results.critical_count || 0,
          high: data.scan_results.high_count || 0,
          exploitable: data.scan_results.exploitable_count || 0
        })
      }

      if (data.status === "running" || data.status === "pending") {
        setIsLoading(true)
        setStatus("Monitoring scan...")
        pollResults(client, job.job_id)
      } else {
        setIsLoading(false)
        setStatus(data.status === "completed" ? "Scan completed" : "Scan failed")
      }
    }
  }

  const handleBackToList = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }

    setSelectedJobId(null)
    setViewMode("list")
    setJobStatus(null)
    setStats({ critical: 0, high: 0, exploitable: 0 })
    setStatus("")
    setActiveTab("results")

    loadJobs()
  }

  const getPageNumbers = () => {
    const pages: number[] = []
    const maxVisiblePages = 5

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      const startPage = Math.max(1, currentPage - 2)
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
    }

    return pages
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

  const handleStatusChange = (online: boolean) => {
    setIsConnected(online)
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <ServiceStatusIndicator
        url={String(process.env.NEXT_PUBLIC_MISCONFIG_CHECKER_API) + "/api/health"}
        serviceName="Misconfig Checker"
        variant="alert"
        onStatusChange={handleStatusChange}
        checkInterval={30000}
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
            {isLoading ? "Scanning..." : "Run Scan"}
          </Button>
        </div>
      </div>

      {/* VIEW: Jobs List */}
      {viewMode === "list" && (
        <>
          {/* Unified Jobs Card */}
          <Card>
            <CardHeader className="space-y-4">
              <div className="flex gap-4 items-center">
                <Input
                  placeholder="Search domains..."
                  value={domainSearch}
                  onChange={(e) => setDomainSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && loadJobs()}
                  className="flex-1"
                />
                <Button onClick={() => loadJobs()} variant="outline">
                  Search
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-sm font-medium text-muted-foreground mr-2">Status:</span>
                <Badge
                  variant={statusFilter === "all" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter("all")}
                >
                  All ({totalJobs})
                </Badge>
                <Badge
                  variant={statusFilter === "pending" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter("pending")}
                >
                  Pending
                </Badge>
                <Badge
                  variant={statusFilter === "running" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter("running")}
                >
                  Running
                </Badge>
                <Badge
                  variant={statusFilter === "completed" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter("completed")}
                >
                  Completed
                </Badge>
                <Badge
                  variant={statusFilter === "failed" ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter("failed")}
                >
                  Failed
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              {jobsLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : jobsError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error loading jobs</AlertTitle>
                  <AlertDescription>{jobsError}</AlertDescription>
                </Alert>
              ) : jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12">
                  <ShieldCheck className="h-12 w-12 mb-4 text-muted-foreground opacity-20" />
                  <p className="text-muted-foreground">No scan jobs found.</p>
                </div>
              ) : (
                <div className="border border-border rounded-lg p-4">
                  <div className="border border-background rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Domain</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {jobs.map((job) => (
                          <TableRow
                            key={job.job_id}
                            className="cursor-pointer hover:bg-accent/50"
                            onClick={() => handleJobSelect(job)}
                          >
                            <TableCell className="font-medium">{job.domain}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  job.status === "completed" ? "default" :
                                    job.status === "failed" ? "destructive" :
                                      job.status === "running" ? "secondary" : "outline"
                                }
                              >
                                {job.status === "running" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                                {job.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {new Date(job.created_at).toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalJobs)} of {totalJobs} jobs
                  </div>

                  <div className="flex gap-2 items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadJobs(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    <div className="flex gap-1">
                      {getPageNumbers().map((pageNum) => (
                        <Button
                          key={pageNum}
                          variant={pageNum === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => loadJobs(pageNum)}
                          className="w-10"
                        >
                          {pageNum}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadJobs(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* VIEW: Job Detail */}
      {viewMode === "detail" && (
        <>
          {/* Stats Cards */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div> */}

          {/* Main Content Tabs */}
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="pb-0">
              <div className="flex items-center gap-4">
                <Button onClick={handleBackToList} variant="outline" size="sm" className="gap-2">
                  <ArrowLeft size={16} />
                  Back to Jobs
                </Button>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList>
                    <TabsTrigger value="results">Results</TabsTrigger>
                    {/* <TabsTrigger value="services">Services <Badge variant="secondary" className="ml-2 text-[10px]">{detectedServices.length}</Badge></TabsTrigger>
                <TabsTrigger value="vulnerabilities">Vulnerabilities</TabsTrigger> */}
                    <TabsTrigger value="logs">Execution Log</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">

              <div className="h-[500px] p-6">

                {activeTab === "results" && (
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
                      <Table className="border rounded-lg overflow-hidden">
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
        </>
      )}
    </div>
  )
}
