"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { 
  Zap, 
  Loader2, 
  Shield, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Upload, 
  Play, 
  FileJson, 
  Search, 
  X,
  Settings,
  Activity,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  Target,
  Bug,
  AlertTriangle
} from "lucide-react"

interface APIDiscoveryProps {
  domain: string
}

// API Response Types
interface ContextResponse {
  success: boolean
  context_name: string
  owner: string | null
  created_at: number
  message: string
}

interface UploadResponse {
  success: boolean
  filename: string
  file_type: string
  spec_version: string | null
  discovered_urls: string[]
  message: string
  error: string | null
}

interface AlertResponse {
  name: string
  risk: string
  confidence: string
  description: string | null
  solution: string | null
  reference: string | null
  url: string
  method: string | null
  param: string | null
  attack: string | null
  evidence: string | null
}

interface SpiderConfig {
  target: string
  wait?: boolean
  timeout?: number
}

interface StatusMessage {
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface ScanConfig {
  enable_all?: boolean
  scanner_ids?: number[]
  wait?: boolean
  timeout?: number
}

export function APIChecker({ domain }: APIDiscoveryProps) {
  // Context Management
  const [currentContext, setCurrentContext] = useState<ContextResponse | null>(null)
  const [contextStatus, setContextStatus] = useState<StatusMessage | null>(null)
  
  // Discovery State
  const [isCreatingContext, setIsCreatingContext] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isSpiderRunning, setIsSpiderRunning] = useState(false)
  const [specFile, setSpecFile] = useState<File | null>(null)
  const [discoveredUrls, setDiscoveredUrls] = useState<string[]>([])
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const [discoveryStatus, setDiscoveryStatus] = useState<StatusMessage | null>(null)
  
  // Spider Configuration
  const [spiderConfig, setSpiderConfig] = useState<SpiderConfig>({
    target: domain || '',
    wait: true,
    timeout: 300
  })
  
  // Scan Management
  const [scanStatus, setScanStatus] = useState<StatusMessage | null>(null)
  const [selectedScanType, setSelectedScanType] = useState<'passive' | 'active'>('passive')
  const [isScanning, setIsScanning] = useState(false)
  
  // Results
  const [alerts, setAlerts] = useState<AlertResponse[]>([])
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false)

  // Initialize spider config when domain changes
  useEffect(() => {
    if (domain) {
      setSpiderConfig(prev => ({
        ...prev,
        target: domain
      }))
    }
  }, [domain])

  // API Helper Functions
  const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_TESTER_URL || "http://localhost:8000"

  // Context Management Functions
  const createContext = async () => {
    setIsCreatingContext(true)
    setContextStatus(null)
    try {
      const response = await fetch(`${getApiBaseUrl()}/context/new`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_hint: `api-scan-${Date.now()}`,
          owner_id: `user-${Date.now()}`
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to create context: ${response.statusText}`)
      }

      const context: ContextResponse = await response.json()
      setCurrentContext(context)
      setContextStatus({
        message: `Context created successfully (${context.context_name})`,
        type: 'success'
      })
    } catch (error) {
      console.error("Error creating context:", error)
      setContextStatus({
        message: `Failed to create context: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      })
    } finally {
      setIsCreatingContext(false)
    }
  }

  const deleteContext = async () => {
    if (!currentContext) return
    
    try {
      await fetch(`${getApiBaseUrl()}/context/${currentContext.context_name}`, {
        method: 'DELETE'
      })
      
      setCurrentContext(null)
      setDiscoveredUrls([])
      setSelectedUrls(new Set())
      setAlerts([])
      setContextStatus({
        message: 'Context deleted successfully',
        type: 'info'
      })
    } catch (error) {
      console.error("Error deleting context:", error)
    }
  }

  // Discovery Functions
  const handleFileUpload = async (file: File) => {
    if (!currentContext) {
      setDiscoveryStatus({ message: 'Please create a context first', type: 'error' })
      return
    }

    setSpecFile(file)
    setIsUploading(true)
    setDiscoveryStatus(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const targetParam = spiderConfig.target ? `?target=${encodeURIComponent(spiderConfig.target)}` : ''
      
      const response = await fetch(`${getApiBaseUrl()}/upload_openapi${targetParam}`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`)
      }

      const uploadResult: UploadResponse = await response.json()
      setDiscoveredUrls(uploadResult.discovered_urls)
      
      setDiscoveryStatus({
        message: `Successfully uploaded! Discovered ${uploadResult.discovered_urls.length} endpoints.`,
        type: 'success'
      })
    } catch (error) {
      console.error("Error uploading spec file:", error)
      setDiscoveryStatus({
        message: `Failed to upload: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRunSpider = async () => {
    if (!currentContext || !spiderConfig.target) {
      setDiscoveryStatus({ 
        message: 'Please create a context and enter a target URL first', 
        type: 'error' 
      })
      return
    }
    
    setIsSpiderRunning(true)
    setDiscoveryStatus({ message: 'Starting spider crawl...', type: 'info' })
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/spider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(spiderConfig),
      })

      if (!response.ok) {
        throw new Error(`Spider failed: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Fetch discovered URLs after spider completes
      await fetchUrls()
      
      setDiscoveryStatus({
        message: `Spider completed! Check endpoints tab for discovered URLs.`,
        type: 'success'
      })
      
    } catch (error) {
      console.error("Error running spider:", error)
      setDiscoveryStatus({
        message: `Spider failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      })
    } finally {
      setIsSpiderRunning(false)
    }
  }

  // URL Management Functions
  const fetchUrls = async () => {
    try {
      const response = await fetch(`${getApiBaseUrl()}/urls`)
      if (response.ok) {
        const urlsData: string[] = await response.json()
        setDiscoveredUrls(urlsData)
      }
    } catch (error) {
      console.error("Error fetching URLs:", error)
    }
  }

  const toggleUrlSelection = (url: string) => {
    const newSelection = new Set(selectedUrls)
    if (newSelection.has(url)) {
      newSelection.delete(url)
    } else {
      newSelection.add(url)
    }
    setSelectedUrls(newSelection)
  }

  const applyUrlSelection = async () => {
    if (!currentContext || selectedUrls.size === 0) return
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/context/${currentContext.context_name}/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: Array.from(selectedUrls),
          action: 'add'
        })
      })
      
      if (response.ok) {
        setDiscoveryStatus({
          message: `Applied ${selectedUrls.size} URLs to context for scanning`,
          type: 'success'
        })
      }
    } catch (error) {
      console.error("Error applying selection:", error)
      setDiscoveryStatus({
        message: 'Failed to apply URL selection',
        type: 'error'
      })
    }
  }

  // Scan Management Functions
  const runScan = async () => {
    if (!currentContext) {
      setScanStatus({ message: 'Please create a context first', type: 'error' })
      return
    }

    if (selectedUrls.size === 0) {
      setScanStatus({ message: 'Please select at least one URL for scanning', type: 'error' })
      return
    }

    // First apply the URL selection to the context
    await applyUrlSelection()

    setIsScanning(true)
    setScanStatus({
      message: `Starting ${selectedScanType} scan...`,
      type: 'info'
    })

    try {
      const scanConfig: ScanConfig = {
        enable_all: true,
        wait: true,
        timeout: 300
      }

      const endpoint = selectedScanType === 'passive' ? '/passive_scan' : '/active_scan'
      const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scanConfig)
      })

      if (!response.ok) {
        throw new Error(`Failed to start scan: ${response.statusText}`)
      }

      setScanStatus({
        message: `${selectedScanType.toUpperCase()} scan completed successfully`,
        type: 'success'
      })

      // Fetch alerts after scan completes
      await fetchAlerts()
    } catch (error) {
      console.error("Error running scan:", error)
      setScanStatus({
        message: `Failed to run scan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        type: 'error'
      })
    } finally {
      setIsScanning(false)
    }
  }

  const fetchAlerts = async () => {
    setIsLoadingAlerts(true)
    try {
      const response = await fetch(`${getApiBaseUrl()}/alerts`)
      if (response.ok) {
        const alertsData: AlertResponse[] = await response.json()
        setAlerts(alertsData)
      }
    } catch (error) {
      console.error("Error fetching alerts:", error)
    } finally {
      setIsLoadingAlerts(false)
    }
  }

  // Helper Functions
  const getRiskColor = (risk: string) => {
    const colors: Record<string, string> = {
      High: "bg-red-500/10 text-red-500 border-red-500/20",
      Medium: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      Low: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      Informational: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    }
    return colors[risk] || "bg-gray-500/10 text-gray-500 border-gray-500/20"
  }

  const getStatusMessage = () => {
    if (!currentContext) return { message: 'No active context', type: 'info' as const }
    if (isScanning) return { message: `${selectedScanType.toUpperCase()} scan in progress...`, type: 'info' as const }
    if (alerts.length > 0) return { message: `Scan completed with ${alerts.length} findings`, type: 'success' as const }
    return { message: 'Ready to scan', type: 'info' as const }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">API Security Scanner</h1>
        <p className="text-muted-foreground">Discover, analyze, and test API security with OWASP ZAP</p>
      </div>

      {/* Context Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} className="text-accent" />
            Context Management
          </CardTitle>
          <CardDescription>Manage your ZAP scanning context</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                currentContext ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-medium">
                {currentContext 
                  ? `Context Active (${currentContext.context_name})` 
                  : 'No active context'
                }
              </span>
            </div>
            <div className="flex gap-2">
              {!currentContext ? (
                <Button
                  onClick={createContext}
                  disabled={isCreatingContext}
                >
                  {isCreatingContext ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Play size={16} className="mr-2" />
                      Create Context
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={deleteContext}
                >
                  <X size={16} className="mr-2" />
                  End Context
                </Button>
              )}
            </div>
          </div>
          
          {contextStatus && (
            <div className={`p-4 rounded-lg border ${
              contextStatus.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-500' :
              contextStatus.type === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-500' :
              'bg-blue-500/5 border-blue-500/20 text-blue-500'
            }`}>
              <p className="text-sm">{contextStatus.message}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="discovery" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="endpoints" disabled={!currentContext}>URLs</TabsTrigger>
          <TabsTrigger value="scan" disabled={!currentContext || discoveredUrls.length === 0}>Scan</TabsTrigger>
          <TabsTrigger value="results" disabled={!currentContext}>Results</TabsTrigger>
        </TabsList>

        {/* Discovery Tab */}
        <TabsContent value="discovery" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* OpenAPI Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileJson size={20} className="text-accent" />
                  OpenAPI Specification
                </CardTitle>
                <CardDescription>Upload JSON or YAML spec file</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept=".json,.yaml,.yml"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0])
                      }
                    }}
                    className="hidden"
                    id="spec-upload"
                    disabled={!currentContext || isUploading}
                  />
                  <label htmlFor="spec-upload" className={`cursor-pointer block ${!currentContext ? 'opacity-50' : ''}`}>
                    <Upload size={24} className="mx-auto mb-2 text-accent" />
                    <p className="text-sm font-medium">
                      {specFile ? specFile.name : "Drag and drop or click to upload"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Limit 10MB • JSON, YAML format
                    </p>
                  </label>
                </div>
                
                {isUploading && (
                  <div className="flex items-center gap-2 p-3 bg-blue-500/5 rounded-lg">
                    <Loader2 size={16} className="animate-spin text-blue-500" />
                    <span className="text-sm text-blue-500">Uploading and parsing specification...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Spider Discovery */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search size={20} className="text-accent" />
                  Spider Crawling
                </CardTitle>
                <CardDescription>Discover endpoints by crawling</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Target URL</label>
                    <Input 
                      value={spiderConfig.target}
                      onChange={(e) => setSpiderConfig(prev => ({ ...prev, target: e.target.value }))}
                      placeholder="https://example.com"
                      disabled={!currentContext || isSpiderRunning}
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Timeout (seconds)</label>
                    <Select
                      value={spiderConfig.timeout?.toString()}
                      onValueChange={(value) => setSpiderConfig(prev => ({ 
                        ...prev, 
                        timeout: parseInt(value) 
                      }))}
                      disabled={!currentContext || isSpiderRunning}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="60">1 minute</SelectItem>
                        <SelectItem value="300">5 minutes</SelectItem>
                        <SelectItem value="600">10 minutes</SelectItem>
                        <SelectItem value="900">15 minutes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button
                  onClick={handleRunSpider}
                  disabled={!currentContext || !spiderConfig.target || isSpiderRunning}
                  className="w-full"
                >
                  {isSpiderRunning ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Crawling...
                    </>
                  ) : (
                    <>
                      <Search size={16} className="mr-2" />
                      Start Spider
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {discoveryStatus && (
            <div className={`p-4 rounded-lg border ${
              discoveryStatus.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-500' :
              discoveryStatus.type === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-500' :
              discoveryStatus.type === 'warning' ? 'bg-orange-500/5 border-orange-500/20 text-orange-500' :
              'bg-blue-500/5 border-blue-500/20 text-blue-500'
            }`}>
              <p className="text-sm font-medium">{discoveryStatus.message}</p>
            </div>
          )}
        </TabsContent>

        {/* URLs Tab */}
        <TabsContent value="endpoints" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Target size={20} className="text-accent" />
                    Discovered URLs
                  </CardTitle>
                  <CardDescription>
                    {selectedUrls.size} of {discoveredUrls.length} URLs selected for scanning
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUrls(new Set(discoveredUrls))}
                  >
                    <Eye size={16} className="mr-2" />
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUrls(new Set())}
                  >
                    <EyeOff size={16} className="mr-2" />
                    Deselect All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchUrls}
                  >
                    <RefreshCw size={16} className="mr-2" />
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {discoveredUrls.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No URLs discovered yet</p>
                  <p className="text-sm">Use the Discovery tab to find URLs</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {discoveredUrls.map((url, index) => (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selectedUrls.has(url)
                          ? "bg-card border-border"
                          : "bg-muted/50 border-muted opacity-60"
                      }`}
                    >
                      <Checkbox
                        checked={selectedUrls.has(url)}
                        onCheckedChange={() => toggleUrlSelection(url)}
                        id={`url-${index}`}
                      />
                      <div className="flex-1 min-w-0">
                        <code className="text-sm font-mono truncate block">{url}</code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scan Tab */}
        <TabsContent value="scan" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Scan Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings size={20} className="text-accent" />
                  Scan Configuration
                </CardTitle>
                <CardDescription>Choose scan type and settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Scan Mode</label>
                  <Select value={selectedScanType} onValueChange={(value: 'passive' | 'active') => setSelectedScanType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="passive">
                        <div className="flex items-center gap-2">
                          <Shield size={16} className="text-green-500" />
                          <div>
                            <div className="font-medium">PASSIVE Mode</div>
                            <div className="text-xs text-muted-foreground">Safe passive scanning only</div>
                          </div>
                        </div>
                      </SelectItem>
                      <SelectItem value="active">
                        <div className="flex items-center gap-2">
                          <Bug size={16} className="text-red-500" />
                          <div>
                            <div className="font-medium">ACTIVE Mode</div>
                            <div className="text-xs text-muted-foreground">Active vulnerability testing</div>
                          </div>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-start gap-3">
                    {selectedScanType === 'passive' ? (
                      <Shield size={20} className="text-green-500 mt-0.5" />
                    ) : (
                      <AlertTriangle size={20} className="text-red-500 mt-0.5" />
                    )}
                    <div>
                      <h4 className="font-medium text-sm">
                        {selectedScanType === 'passive' ? 'Passive Mode' : 'Active Mode'}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedScanType === 'passive' 
                          ? 'Performs passive analysis without sending potentially harmful requests. Safe for production environments.'
                          : 'Performs active security testing including injection attacks. Use only on test environments with proper authorization.'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={runScan}
                  disabled={!currentContext || selectedUrls.size === 0 || isScanning}
                  className="w-full"
                  variant={selectedScanType === 'active' ? 'destructive' : 'default'}
                >
                  {isScanning ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      {selectedScanType === 'passive' ? (
                        <Shield size={16} className="mr-2" />
                      ) : (
                        <Bug size={16} className="mr-2" />
                      )}
                      Start {selectedScanType.toUpperCase()} Scan
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Scan Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity size={20} className="text-accent" />
                  Scan Status
                </CardTitle>
                <CardDescription>Current scan progress</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Scan Type</span>
                    <Badge variant="outline" className={selectedScanType === 'active' ? 'text-red-500' : 'text-green-500'}>
                      {selectedScanType.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Status</span>
                    <Badge variant="outline" className={
                      isScanning ? 'text-blue-500' :
                      alerts.length > 0 ? 'text-green-500' :
                      'text-gray-500'
                    }>
                      {isScanning ? 'RUNNING' : alerts.length > 0 ? 'COMPLETED' : 'READY'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Selected URLs</span>
                    <span>{selectedUrls.size}</span>
                  </div>
                </div>
                
                {!isScanning && alerts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No scan running</p>
                    <p className="text-xs">Configure and start a scan to see progress</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
          
          {scanStatus && (
            <div className={`p-4 rounded-lg border ${
              scanStatus.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-500' :
              scanStatus.type === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-500' :
              scanStatus.type === 'warning' ? 'bg-orange-500/5 border-orange-500/20 text-orange-500' :
              'bg-blue-500/5 border-blue-500/20 text-blue-500'
            }`}>
              <p className="text-sm font-medium">{scanStatus.message}</p>
            </div>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bug size={20} className="text-accent" />
                    Security Findings
                  </CardTitle>
                  <CardDescription>
                    {alerts.length} findings found in {selectedScanType.toUpperCase()} scan
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchAlerts}
                  disabled={isLoadingAlerts}
                >
                  {isLoadingAlerts ? (
                    <Loader2 size={16} className="mr-2 animate-spin" />
                  ) : (
                    <RefreshCw size={16} className="mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingAlerts ? (
                <div className="text-center py-8">
                  <Loader2 size={32} className="mx-auto mb-4 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading security findings...</p>
                </div>
              ) : alerts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 size={48} className="mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">No security issues found</p>
                  <p className="text-sm">The scan completed without detecting any vulnerabilities</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className={getRiskColor(alert.risk)}>
                              {alert.risk}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {alert.confidence}
                            </Badge>
                            {alert.method && (
                              <Badge variant="outline" className="text-xs font-mono">
                                {alert.method}
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium mb-1">{alert.name}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{alert.url}</p>
                          {alert.param && (
                            <p className="text-xs text-muted-foreground mb-2">
                              Parameter: <code className="bg-muted px-1 rounded">{alert.param}</code>
                            </p>
                          )}
                          {alert.description && (
                            <p className="text-sm text-muted-foreground mb-2">{alert.description}</p>
                          )}
                          {alert.solution && (
                            <div className="text-sm">
                              <span className="font-medium text-green-600">Solution: </span>
                              <span className="text-muted-foreground">{alert.solution}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {alert.evidence && (
                        <details className="mt-3">
                          <summary className="text-sm font-medium cursor-pointer text-muted-foreground">
                            Show Evidence
                          </summary>
                          <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-auto">
                            {alert.evidence}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Status Bar */}
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                currentContext ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-medium">
                {getStatusMessage().message}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>URLs: {discoveredUrls.length}</span>
              <span>Selected: {selectedUrls.size}</span>
              <span>Findings: {alerts.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
