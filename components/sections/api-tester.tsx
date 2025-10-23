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
  RefreshCw,
  Target,
  Bug,
  AlertTriangle,
  Server,
  Power,
  Trash2
} from "lucide-react"

interface APIDiscoveryProps {
  domain: string
}

// API Response Types
// New backend API types (flexible where schema is not strict)
interface ZAPInstanceResponse {
  instance_id: string
  port: number
  api_key: string
  status: string
  created_at: string
}

interface AlertsEnvelope {
  alerts: any[]
  count: number
}

interface NormalizedAlert {
  name: string
  risk: string
  confidence: string
  description?: string | null
  solution?: string | null
  reference?: string | null
  url: string
  method?: string | null
  param?: string | null
  attack?: string | null
  evidence?: string | null
}

interface SpiderRequest {
  target_url: string
  max_children?: number | null
  recurse?: boolean | null
  context_name?: string | null
}

interface StatusMessage {
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}

interface ScanRequest {
  target_url: string
  scan_type: 'active' | 'passive'
  context_name?: string | null
}

interface ScannerInfo {
  id: string | number
  name: string
  enabled?: boolean | string
  quality?: string
  status?: string
  alertThreshold?: string
  attackStrength?: string
  cweId?: string | number
}

export function APIChecker({ domain }: APIDiscoveryProps) {
  // Global URL Input
  const [targetUrl, setTargetUrl] = useState<string>(domain || '')

  // Instance Management
  const [instances, setInstances] = useState<ZAPInstanceResponse[]>([])
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null)
  const [isCreatingInstance, setIsCreatingInstance] = useState(false)
  const [isLoadingInstances, setIsLoadingInstances] = useState(false)
  const [instanceStatus, setInstanceStatus] = useState<StatusMessage | null>(null)

  // Contexts
  const [contexts, setContexts] = useState<string[]>([])
  const [selectedContext, setSelectedContext] = useState<string | null>(null)
  const [isLoadingContexts, setIsLoadingContexts] = useState(false)
  const [isCreatingContext, setIsCreatingContext] = useState(false)
  const [newContextName, setNewContextName] = useState<string>("")
  const [contextStatus, setContextStatus] = useState<StatusMessage | null>(null)

  // Discovery State
  const [isUploading, setIsUploading] = useState(false)
  const [isSpiderRunning, setIsSpiderRunning] = useState(false)
  const [specFile, setSpecFile] = useState<File | null>(null)
  const [discoveredUrls, setDiscoveredUrls] = useState<string[]>([])
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const [discoveryStatus, setDiscoveryStatus] = useState<StatusMessage | null>(null)

  // Spider Configuration
  const [spiderConfig, setSpiderConfig] = useState<SpiderRequest>({
    target_url: domain || '',
    recurse: true,
    max_children: null,
    context_name: null,
  })
  const [spiderScanId, setSpiderScanId] = useState<string | null>(null)
  const [spiderProgress, setSpiderProgress] = useState<number>(0)

  // Scan Management
  const [scanStatus, setScanStatus] = useState<StatusMessage | null>(null)
  const [selectedScanType, setSelectedScanType] = useState<'passive' | 'active'>('passive')
  const [isScanning, setIsScanning] = useState(false)
  const [activeScanId, setActiveScanId] = useState<string | null>(null)
  const [activeScanProgress, setActiveScanProgress] = useState<number>(0)

  // Scanners (optional management)
  const [scanners, setScanners] = useState<ScannerInfo[]>([])
  const [isLoadingScanners, setIsLoadingScanners] = useState(false)

  // Results
  const [alerts, setAlerts] = useState<NormalizedAlert[]>([])
  const [alertsCount, setAlertsCount] = useState<number>(0)
  const [isLoadingAlerts, setIsLoadingAlerts] = useState(false)

  // Initialize URLs when domain changes
  useEffect(() => {
    if (domain) {
      setTargetUrl(domain)
      setSpiderConfig(prev => ({
        ...prev,
        target_url: domain
      }))
    }
  }, [domain])

  // API Helper Functions
  const getApiBaseUrl = () => process.env.NEXT_PUBLIC_API_TESTER_URL || "http://localhost:8000"

  const apiGet = async (path: string, init?: RequestInit) => {
    const res = await fetch(`${getApiBaseUrl()}${path}`, { ...init, method: 'GET' })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  }

  const apiPost = async (path: string, body?: any, init?: RequestInit) => {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      method: 'POST',
      headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
      ...init,
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    return res.json()
  }

  // Instance Management Functions
  const loadInstances = useCallback(async () => {
    setIsLoadingInstances(true)
    try {
      const raw = await apiGet('/instances')
      let list: any[] = []
      if (Array.isArray(raw)) {
        list = raw
      } else if (Array.isArray(raw?.instances)) {
        list = raw.instances
      } else if (raw && typeof raw === 'object') {
        // Some backends may return a dict keyed by id
        const values = Object.values(raw)
        if (Array.isArray(values) && (values.length === 0 || typeof values[0] === 'object')) {
          list = values as any[]
        }
      }
      setInstances((list || []) as ZAPInstanceResponse[])
      // Auto-select first instance if none selected
      if (!selectedInstanceId && Array.isArray(list) && list.length > 0 && list[0]?.instance_id) {
        setSelectedInstanceId(list[0].instance_id)
      }
    } catch (e) {
      console.error('Failed to load instances', e)
      setInstanceStatus({ message: `Failed to load instances: ${e instanceof Error ? e.message : 'Unknown error'}` , type: 'error'})
    } finally {
      setIsLoadingInstances(false)
    }
  }, [selectedInstanceId])

  useEffect(() => { loadInstances() }, [loadInstances])

  const createInstance = async () => {
    setIsCreatingInstance(true)
    setInstanceStatus(null)
    try {
      const inst: ZAPInstanceResponse = await apiPost('/instances')
      setInstances(prev => [inst, ...prev])
      setSelectedInstanceId(inst.instance_id)
      setInstanceStatus({ message: `Instance created (${inst.instance_id})`, type: 'success' })
    } catch (e) {
      console.error('Create instance failed', e)
      setInstanceStatus({ message: `Failed to create instance: ${e instanceof Error ? e.message : 'Unknown error'}`, type: 'error' })
    } finally {
      setIsCreatingInstance(false)
    }
  }

  const deleteInstance = async (instanceId: string) => {
    try {
      await fetch(`${getApiBaseUrl()}/instances/${instanceId}`, { method: 'DELETE' })
      setInstances(prev => prev.filter(i => i.instance_id !== instanceId))
      if (selectedInstanceId === instanceId) {
        setSelectedInstanceId(null)
        setContexts([])
        setSelectedContext(null)
        setDiscoveredUrls([])
        setSelectedUrls(new Set())
        setAlerts([])
      }
      setInstanceStatus({ message: `Instance ${instanceId} deleted`, type: 'info' })
    } catch (e) {
      console.error('Delete instance failed', e)
      setInstanceStatus({ message: `Failed to delete instance: ${e instanceof Error ? e.message : 'Unknown error'}`, type: 'error' })
    }
  }

  // Context Management Functions (per instance)
  const loadContexts = useCallback(async () => {
    if (!selectedInstanceId) return
    setIsLoadingContexts(true)
    try {
      const data = await apiGet(`/instances/${selectedInstanceId}/contexts`)
      // Accept array of strings or array of objects with name
      const list: string[] = Array.isArray(data) ? data : (data?.contexts || [])
      setContexts(list)
      if (!selectedContext && list.length > 0) setSelectedContext(list[0])
    } catch (e) {
      console.error('Failed to load contexts', e)
      setContexts([])
    } finally {
      setIsLoadingContexts(false)
    }
  }, [selectedInstanceId, selectedContext])

  useEffect(() => { loadContexts() }, [loadContexts])

  const createContext = async () => {
    if (!selectedInstanceId || !newContextName.trim()) return
    setIsCreatingContext(true)
    setContextStatus(null)
    try {
      await apiPost(`/instances/${selectedInstanceId}/context`, {
        context_name: newContextName.trim(),
        include_regex: [],
        exclude_regex: [],
      })
      setContextStatus({ message: `Context created (${newContextName})`, type: 'success' })
      setNewContextName('')
      await loadContexts()
    } catch (e) {
      console.error('Create context failed', e)
      setContextStatus({ message: `Failed to create context: ${e instanceof Error ? e.message : 'Unknown error'}`, type: 'error' })
    } finally {
      setIsCreatingContext(false)
    }
  }

  // Context Management Functions
  // (No explicit delete context endpoint in spec) — skipping

  // Discovery Functions
  const handleFileUpload = async (file: File) => {
    if (!selectedInstanceId) {
      setDiscoveryStatus({ message: 'Please create/select an instance first', type: 'error' })
      return
    }

    setSpecFile(file)
    setIsUploading(true)
    setDiscoveryStatus(null)
    
    try {
      const formData = new FormData()
      formData.append('file', file, file.name)

      await apiPost(`/instances/${selectedInstanceId}/openapi`, formData)

      setDiscoveryStatus({
        message: `OpenAPI uploaded successfully. Refreshing URLs...`,
        type: 'success'
      })
      await fetchUrls()
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
    if (!selectedInstanceId || !spiderConfig.target_url) {
      setDiscoveryStatus({ 
        message: 'Please select an instance and enter a target URL first', 
        type: 'error' 
      })
      return
    }

    setIsSpiderRunning(true)
    setDiscoveryStatus({ message: 'Starting spider crawl...', type: 'info' })
    setSpiderProgress(0)

    try {
      const payload: SpiderRequest = {
        target_url: spiderConfig.target_url,
        context_name: selectedContext || undefined,
        recurse: spiderConfig.recurse ?? true,
        max_children: spiderConfig.max_children ?? null,
      }
      const data = await apiPost(`/instances/${selectedInstanceId}/spider`, payload)
      const sid = data?.scan_id || data?.scanId || data?.id || data?.scan || null
      setSpiderScanId(sid)
      setDiscoveryStatus({ message: sid ? `Spider started (scan: ${sid}). Monitoring progress...` : 'Spider started. Monitoring progress...', type: 'info' })

      // Poll status
      if (sid) {
        await pollSpiderStatus(sid)
      }

      // Fetch URLs after completion
      await fetchUrls()
      setDiscoveryStatus({ message: 'Spider completed! Check URLs tab for discovered endpoints.', type: 'success' })
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

  const pollSpiderStatus = async (scanId: string) => {
    if (!selectedInstanceId) return
    let done = false
    const start = Date.now()
    while (!done) {
      await new Promise(r => setTimeout(r, 1500))
      try {
        const status = await apiGet(`/instances/${selectedInstanceId}/spider/${scanId}/status`)
        // Accept percent, progress, or status string
        const percent = Number(status?.progress ?? status?.percentage ?? status?.percent ?? 0)
        if (!Number.isNaN(percent)) setSpiderProgress(Math.max(0, Math.min(100, percent)))
        const state = String(status?.status || '').toLowerCase()
        if (percent >= 100 || ['done','complete','completed','finished'].includes(state)) {
          done = true
          break
        }
        if (Date.now() - start > 15 * 60 * 1000) { // 15 minutes safety
          setDiscoveryStatus({ message: 'Spider polling timed out after 15 minutes', type: 'warning' })
          break
        }
      } catch (e) {
        console.error('Spider status polling error', e)
        break
      }
    }
  }

  // URL Management Functions
  const fetchUrls = async () => {
    if (!selectedInstanceId) return
    try {
      const responseData = await apiGet(`/instances/${selectedInstanceId}/urls`)
      const urlsData: string[] = responseData?.urls || responseData || []
      setDiscoveredUrls(Array.isArray(urlsData) ? urlsData : [])
    } catch (error) {
      console.error("Error fetching URLs:", error)
      setDiscoveredUrls([])
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
    if (selectedUrls.size === 0) {
      setDiscoveryStatus({ message: 'Please select at least one URL first', type: 'warning' })
      return
    }
    setDiscoveryStatus({ message: `Selected ${selectedUrls.size} URLs for scanning/filtering.`, type: 'success' })
  }

  // Scan Management Functions
  const runScan = async () => {
    if (!selectedInstanceId) {
      setScanStatus({ message: 'Please create/select an instance first', type: 'error' })
      return
    }
    if (!targetUrl.trim()) {
      setScanStatus({ message: 'Please enter a target URL', type: 'error' })
      return
    }

    setIsScanning(true)
    setActiveScanProgress(0)
    setScanStatus({ message: `Starting ${selectedScanType.toUpperCase()} scan...`, type: 'info' })

    try {
      const payload: ScanRequest = {
        target_url: targetUrl.trim(),
        scan_type: selectedScanType,
        context_name: selectedContext || null,
      }
      const data = await apiPost(`/instances/${selectedInstanceId}/scan/active`, payload)
      const sid = data?.scan_id || data?.scanId || data?.id || data?.scan || null
      setActiveScanId(sid)

      if (sid) {
        await pollActiveScanStatus(sid)
      }

      setScanStatus({ message: `${selectedScanType.toUpperCase()} scan completed`, type: 'success' })
      await fetchAlerts()
    } catch (error) {
      console.error("Error running scan:", error)
      setScanStatus({ message: `Failed to run scan: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'error' })
    } finally {
      setIsScanning(false)
    }
  }

  const pollActiveScanStatus = async (scanId: string) => {
    if (!selectedInstanceId) return
    let done = false
    const start = Date.now()
    while (!done) {
      await new Promise(r => setTimeout(r, 1500))
      try {
        const status = await apiGet(`/instances/${selectedInstanceId}/scan/active/${scanId}/status`)
        const percent = Number(status?.progress ?? status?.percentage ?? status?.percent ?? 0)
        if (!Number.isNaN(percent)) setActiveScanProgress(Math.max(0, Math.min(100, percent)))
        const state = String(status?.status || '').toLowerCase()
        if (percent >= 100 || ['done','complete','completed','finished'].includes(state)) {
          done = true
          break
        }
        if (Date.now() - start > 30 * 60 * 1000) { // 30 minutes safety
          setScanStatus({ message: 'Scan polling timed out after 30 minutes', type: 'warning' })
          break
        }
      } catch (e) {
        console.error('Active scan status polling error', e)
        break
      }
    }
  }

  const normalizeAlert = (a: any): NormalizedAlert => ({
    name: a?.name || a?.alert || a?.title || 'Alert',
    risk: a?.risk || a?.riskdesc || a?.riskDesc || 'Informational',
    confidence: a?.confidence || a?.confidencedesc || a?.confidenceDesc || 'Medium',
    description: a?.description ?? a?.desc ?? null,
    solution: a?.solution ?? null,
    reference: a?.reference ?? null,
    url: a?.url || a?.uri || a?.endpoint || '',
    method: a?.method ?? null,
    param: a?.param ?? null,
    attack: a?.attack ?? null,
    evidence: a?.evidence ?? null,
  })

  const fetchAlerts = async () => {
    if (!selectedInstanceId) return
    setIsLoadingAlerts(true)
    try {
      const qs = new URLSearchParams()
      if (targetUrl.trim()) qs.set('baseurl', targetUrl.trim())
      qs.set('start', '0')
      qs.set('count', '500')
      const data: AlertsEnvelope = await apiGet(`/instances/${selectedInstanceId}/alerts?${qs.toString()}`)
      const list = (data?.alerts || []) as any[]
      setAlerts(list.map(normalizeAlert))
      setAlertsCount(Number(data?.count || list.length))
    } catch (error) {
      console.error("Error fetching alerts:", error)
      setAlerts([])
      setAlertsCount(0)
    } finally {
      setIsLoadingAlerts(false)
    }
  }

  // Scanners Management (enable/disable globally in instance)
  const loadScanners = useCallback(async () => {
    if (!selectedInstanceId) return
    setIsLoadingScanners(true)
    try {
      const data = await apiGet(`/instances/${selectedInstanceId}/scan/scanners`)
      const list: ScannerInfo[] = (data?.scanners || data || []).map((s: any) => ({
        id: s.id ?? s.scannerId ?? s.ruleId ?? s?.scanRuleId ?? 'unknown',
        name: s.name || s.rule || 'Scanner',
        enabled: (typeof s.enabled === 'string') ? (s.enabled.toLowerCase() === 'true') : !!s.enabled,
        quality: s.quality,
        status: s.status,
        alertThreshold: s.alertThreshold,
        attackStrength: s.attackStrength,
        cweId: s.cweId ?? s.cwe ?? undefined,
      }))
      setScanners(list)
    } catch (e) {
      console.error('Failed to load scanners', e)
      setScanners([])
    } finally {
      setIsLoadingScanners(false)
    }
  }, [selectedInstanceId])

  useEffect(() => { loadScanners() }, [loadScanners])

  const setScannerEnabled = async (scannerId: string | number, enable: boolean) => {
    if (!selectedInstanceId) return
    try {
      await apiPost(`/instances/${selectedInstanceId}/scan/scanners/${scannerId}/${enable ? 'enable' : 'disable'}`)
      setScanners(prev => prev.map(s => s.id === scannerId ? { ...s, enabled: enable } : s))
    } catch (e) {
      console.error('Failed to toggle scanner', e)
    }
  }

  const enablePassiveScanning = async () => {
    if (!selectedInstanceId) return
    try {
      await apiPost(`/instances/${selectedInstanceId}/passive-scan/enable`)
      setScanStatus({ message: 'Passive scanning enabled', type: 'success' })
    } catch (e) {
      console.error('Enable passive scanning failed', e)
      setScanStatus({ message: 'Failed to enable passive scanning', type: 'error' })
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
    if (!selectedInstanceId) return { message: 'No active ZAP instance', type: 'info' as const }
    if (isScanning) return { message: `${selectedScanType.toUpperCase()} scan in progress (${activeScanProgress}%)...`, type: 'info' as const }
    if (alerts.length > 0) return { message: `Scan completed with ${alerts.length} findings`, type: 'success' as const }
    return { message: 'Ready', type: 'info' as const }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">API Security Scanner</h1>
        <p className="text-muted-foreground">Discover, analyze, and test API security with OWASP ZAP</p>
      </div>

      {/* Instance Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server size={20} className="text-accent" />
            Instance Management
          </CardTitle>
          <CardDescription>Each user runs an isolated ZAP instance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                selectedInstanceId ? 'bg-green-500' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-medium">
                {selectedInstanceId 
                  ? `Active Instance (${selectedInstanceId})` 
                  : 'No active instance'}
              </span>
            </div>
            <div className="flex gap-2">
              <Button onClick={createInstance} disabled={isCreatingInstance}>
                {isCreatingInstance ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Power size={16} className="mr-2" />
                    Create Instance
                  </>
                )}
              </Button>
              {selectedInstanceId && (
                <Button variant="outline" onClick={() => deleteInstance(selectedInstanceId)}>
                  <Trash2 size={16} className="mr-2" />
                  Delete Active
                </Button>
              )}
            </div>
          </div>

          {instanceStatus && (
            <div className={`p-3 rounded-lg border ${
              instanceStatus.type === 'success' ? 'bg-green-500/5 border-green-500/20 text-green-500' :
              instanceStatus.type === 'error' ? 'bg-red-500/5 border-red-500/20 text-red-500' :
              'bg-blue-500/5 border-blue-500/20 text-blue-500'
            }`}>
              <p className="text-sm">{instanceStatus.message}</p>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Instances</span>
              <Badge variant="outline" className="text-xs">{Array.isArray(instances) ? instances.length : 0}</Badge>
            </div>
            {isLoadingInstances ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={16} className="animate-spin" /> Loading instances...
              </div>
            ) : !Array.isArray(instances) || instances.length === 0 ? (
              <div className="text-sm text-muted-foreground">No instances yet. Create one to get started.</div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2">
                {(Array.isArray(instances) ? instances : []).map((inst) => (
                  <div key={inst.instance_id} className={`flex items-center justify-between p-2 rounded border ${selectedInstanceId === inst.instance_id ? 'bg-accent/5 border-accent/40' : 'bg-background border-border'}`}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{inst.status}</Badge>
                        <code className="text-xs truncate">{inst.instance_id}</code>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Port: {inst.port}</div>
                    </div>
                    <div className="flex gap-2">
                      {selectedInstanceId !== inst.instance_id && (
                        <Button size="sm" variant="outline" onClick={() => setSelectedInstanceId(inst.instance_id)}>Select</Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => deleteInstance(inst.instance_id)}>
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Global Target URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target size={20} className="text-accent" />
            Target URL
          </CardTitle>
          <CardDescription>Enter the main URL or domain to scan</CardDescription>
        </CardHeader>
        <CardContent>
          <Input 
            value={targetUrl}
            onChange={(e) => {
              setTargetUrl(e.target.value)
              // Keep spider config in sync
              setSpiderConfig(prev => ({ ...prev, target_url: e.target.value }))
            }}
            placeholder="https://api.example.com"
            className="text-sm"
          />
        </CardContent>
      </Card>

      {/* Context Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity size={20} className="text-accent" />
            Context Management
          </CardTitle>
          <CardDescription>Organize scan scope and include/exclude rules</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!selectedInstanceId ? (
            <div className="p-3 rounded-lg border border-orange-500/20 bg-orange-500/5">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-orange-500" />
                <p className="text-sm text-orange-500 font-medium">
                  Create/select an instance above to manage contexts
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium">New Context Name</label>
                  <Input value={newContextName} onChange={(e) => setNewContextName(e.target.value)} placeholder="e.g. prod-scope" />
                </div>
                <div className="flex items-end">
                  <Button onClick={createContext} disabled={isCreatingContext || !newContextName.trim()} className="w-full">
                    {isCreatingContext ? (
                      <><Loader2 size={16} className="mr-2 animate-spin" /> Creating...</>
                    ) : (
                      <><Play size={16} className="mr-2" /> Create Context</>
                    )}
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Available Contexts</label>
                <div className="mt-2 max-h-40 overflow-y-auto space-y-2">
                  {isLoadingContexts ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 size={16} className="animate-spin" /> Loading contexts...
                    </div>
                  ) : contexts.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No contexts yet</div>
                  ) : (
                    contexts.map((ctx) => (
                      <div key={ctx} className={`flex items-center justify-between p-2 rounded border ${selectedContext === ctx ? 'bg-accent/5 border-accent/40' : 'bg-background border-border'}`}>
                        <code className="text-xs truncate">{ctx}</code>
                        {selectedContext !== ctx && (
                          <Button size="sm" variant="outline" onClick={() => setSelectedContext(ctx)}>Use</Button>
                        )}
                      </div>
                    ))
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="discovery" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="discovery">Discovery</TabsTrigger>
          <TabsTrigger value="endpoints">URLs</TabsTrigger>
          <TabsTrigger value="scan">Scan</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
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
                    disabled={!selectedInstanceId || isUploading}
                  />
                  <label htmlFor="spec-upload" className={`cursor-pointer block ${!selectedInstanceId ? 'opacity-50' : ''}`}>
                    <Upload size={24} className="mx-auto mb-2 text-accent" />
                    <p className="text-sm font-medium">
                      {specFile ? specFile.name : "Drag and drop or click to upload"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {!selectedInstanceId 
                        ? "Create/select an instance first to upload files"
                        : "Limit 10MB • JSON, YAML format"
                      }
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
                      value={spiderConfig.target_url || ''}
                      onChange={(e) => setSpiderConfig(prev => ({ ...prev, target_url: e.target.value }))}
                      placeholder="https://example.com"
                      disabled={!selectedInstanceId || isSpiderRunning}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Children (optional)</label>
                    <Select
                      value={spiderConfig.max_children === null || spiderConfig.max_children === undefined ? 'none' : String(spiderConfig.max_children)}
                      onValueChange={(value) => setSpiderConfig(prev => ({ ...prev, max_children: value === 'none' ? null : parseInt(value) }))}
                      disabled={!selectedInstanceId || isSpiderRunning}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No limit</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button
                  onClick={handleRunSpider}
                  disabled={!selectedInstanceId || !spiderConfig.target_url || isSpiderRunning}
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
                {isSpiderRunning && (
                  <div className="text-xs text-muted-foreground">Progress: {spiderProgress}%</div>
                )}
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
                    {selectedUrls.size} of {(discoveredUrls || []).length} URLs selected for scanning
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUrls(new Set(discoveredUrls || []))}
                    disabled={(discoveredUrls || []).length === 0}
                  >
                    <Eye size={16} className="mr-2" />
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedUrls(new Set())}
                    disabled={selectedUrls.size === 0}
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
              {!selectedInstanceId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No active instance</p>
                  <p className="text-sm">Please create/select an instance first to manage URLs</p>
                </div>
              ) : (discoveredUrls || []).length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Target size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No URLs discovered yet</p>
                  <p className="text-sm">Use the Discovery tab to find URLs via file upload or spider crawling</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-green-500" />
                      <span className="text-sm font-medium">URLs found and ready for selection</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {(discoveredUrls || []).length} total
                    </Badge>
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(discoveredUrls || []).map((url, index) => (
                      <div
                        key={index}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                          selectedUrls.has(url)
                            ? "bg-accent/5 border-accent/40 shadow-sm"
                            : "bg-muted/30 border-muted hover:border-border"
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
                        {selectedUrls.has(url) && (
                          <Badge variant="outline" className="text-xs text-green-600">
                            Selected
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedInstanceId && (discoveredUrls || []).length > 0 && (
                <div className="mt-6 p-4 border rounded-lg bg-card">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">Apply Selection to Context</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Selected URLs will be used for filtering results and targeted scans
                      </p>
                    </div>
                    <Button onClick={applyUrlSelection} disabled={selectedUrls.size === 0} className="shrink-0">
                      <CheckCircle2 size={16} className="mr-2" />
                      Apply {selectedUrls.size > 0 ? `${selectedUrls.size} URLs` : 'Selection'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scan Tab */}
        <TabsContent value="scan" className="space-y-6">
          {!selectedInstanceId ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <Activity size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No active instance</p>
                  <p className="text-sm">Please create/select an instance first to start scanning</p>
                </div>
              </CardContent>
            </Card>
          ) : (
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

                  {/* Scanners management (optional) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm">Scanners</h4>
                      <Button size="sm" variant="outline" onClick={loadScanners} disabled={isLoadingScanners}>
                        <RefreshCw size={14} className="mr-1" /> Refresh
                      </Button>
                    </div>
                    {isLoadingScanners ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Loading scanners...</div>
                    ) : scanners.length === 0 ? (
                      <div className="text-xs text-muted-foreground">No scanners information available</div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2 border rounded-lg p-2 bg-muted/30">
                        {scanners.map(s => (
                          <div key={String(s.id)} className="flex items-center justify-between p-2 rounded border bg-background border-border">
                            <div className="min-w-0">
                              <div className="text-sm truncate">{s.name}</div>
                              <div className="flex gap-2 mt-1">
                                {s.cweId && <Badge variant="outline" className="text-xs">CWE-{s.cweId}</Badge>}
                                {s.quality && <Badge variant="outline" className="text-xs">{s.quality}</Badge>}
                              </div>
                            </div>
                            <Button size="sm" variant={s.enabled ? 'outline' : 'default'} onClick={() => setScannerEnabled(s.id, !s.enabled)}>
                              {s.enabled ? 'Disable' : 'Enable'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={runScan}
                    disabled={!selectedInstanceId || !targetUrl.trim() || isScanning}
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
                  {selectedScanType === 'passive' && (
                    <Button variant="outline" className="w-full" onClick={enablePassiveScanning} disabled={!selectedInstanceId}>
                      Enable Passive Scanning
                    </Button>
                  )}
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
                        {isScanning ? `RUNNING ${activeScanProgress}%` : alerts.length > 0 ? 'COMPLETED' : 'READY'}
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
                      <p className="text-xs">
                        {selectedScanType === 'passive'
                          ? 'Ready to start passive scanning'
                          : 'Configure and start a scan to see progress'
                        }
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>
          )}
          
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
                    {!selectedInstanceId 
                      ? "No active instance for results"
                      : `${alerts.length} findings found in ${selectedScanType.toUpperCase()} scan`
                    }
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchAlerts}
                    disabled={isLoadingAlerts || !selectedInstanceId}
                  >
                    {isLoadingAlerts ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <RefreshCw size={16} className="mr-2" />
                    )}
                    Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedInstanceId ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Activity size={48} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No active instance</p>
                  <p className="text-sm">Please create/select an instance and run a scan to see results</p>
                </div>
              ) : isLoadingAlerts ? (
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
                selectedInstanceId ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
              }`} />
              <span className="text-sm font-medium">
                {getStatusMessage().message}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>URLs: {(discoveredUrls || []).length}</span>
              <span>Selected: {selectedUrls.size}</span>
              <span>Findings: {alerts.length}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
