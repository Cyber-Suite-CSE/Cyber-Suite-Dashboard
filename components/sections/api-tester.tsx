"use client"

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Upload, Search, Eye, EyeOff, Loader2, Play, RefreshCw, PlusCircle, Trash2, Zap } from "lucide-react"
import { ServiceStatusIndicator } from "@/components/service-status-indicator"

interface APICheckerProps {
  domain: string
}

// ===== Types aligned to backend OpenAPI =====
type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO"

type VulnerabilityType =
  | "Authentication Bypass"
  | "Broken Authentication"
  | "Insecure Direct Object Reference"
  | "SQL Injection"
  | "NoSQL Injection"
  | "Cross-Site Scripting"
  | "XML External Entity"
  | "Missing Rate Limiting"
  | "CORS Misconfiguration"
  | "Information Disclosure"
  | "Mass Assignment"
  | "JWT Vulnerability"

interface Finding {
  vuln_type: VulnerabilityType
  severity: SeverityLevel
  endpoint: string
  description: string
  evidence?: Record<string, unknown>
  remediation: string
  timestamp?: string
}

interface ScanReport {
  target: string
  scan_start: string
  scan_end?: string | null
  findings?: Finding[]
  endpoints_tested?: number
  requests_made?: number
}

type AuthType = "bearer" | "basic" | "apikey"

interface AuthConfig {
  auth_type: AuthType
  token?: string | null
  username?: string | null
  password?: string | null
  header_name?: string | null
}

interface EndpointOperation {
  method: string
  path: string
  summary?: string
  operationId?: string
}

// ===== Auth Check Contracts =====
interface AuthCheckRequest {
  base_url: string
  endpoint?: string
  method?: string
  auth?: AuthConfig | null
  timeout?: number
}

interface JWTInfo {
  header?: Record<string, unknown> | null
  claims?: Record<string, unknown> | null
}

interface AuthCheckResult {
  target_url: string
  method: string
  unauth_status: number | null
  auth_status: number | null
  requires_auth: boolean
  is_authenticated: boolean
  detected_auth_type?: AuthType | string | null
  jwt_info?: JWTInfo | null
  response_snippet?: string | null
  error?: string | null
}

// ===== Constants =====
// Mapping between friendly labels and backend codes
const TEST_CODE_BY_LABEL: Record<string, string> = {
  "Broken Authentication": "BROKEN_AUTH",
  "JWT Vulnerability": "JWT_VULN",
  "SQL Injection": "SQL_INJECTION",
  "NoSQL Injection": "NOSQL_INJECTION",
  "Insecure Direct Object Reference": "IDOR",
  "CORS Misconfiguration": "CORS",
  "Information Disclosure": "INFO_DISCLOSURE",
  "Cross-Site Scripting": "XSS",
  "Missing Rate Limiting": "RATE_LIMIT",
  // Best-effort mappings for labels without explicit examples
  "Authentication Bypass": "AUTH_BYPASS",
  "XML External Entity": "XXE",
  "Mass Assignment": "MASS_ASSIGNMENT",
}

const ALL_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const
const VULN_TESTS: VulnerabilityType[] = [
  "Authentication Bypass",
  "Broken Authentication",
  "Insecure Direct Object Reference",
  "SQL Injection",
  "NoSQL Injection",
  "Cross-Site Scripting",
  "XML External Entity",
  "Missing Rate Limiting",
  "CORS Misconfiguration",
  "Information Disclosure",
  "Mass Assignment",
  "JWT Vulnerability",
]

// Backend base URL (configurable via env, defaults to localhost:8000)
const API_BASE = (process.env.NEXT_PUBLIC_API_TESTER_BASE as string);
// Backend bearer token (HTTPBearer). Set NEXT_PUBLIC_BACKEND_BEARER in env to authenticate UI->backend calls.
const BACKEND_BEARER = (process.env.NEXT_PUBLIC_BACKEND_BEARER as string | undefined) || ""
// Optional override for auth check path
const AUTH_CHECK_PATH = (process.env.NEXT_PUBLIC_AUTH_CHECK_PATH as string | undefined) || "/api/v1/auth/check"

// Utility to build Authorization header from auth config
function buildAuthHeaders(auth: AuthConfig | null | undefined): HeadersInit {
  const headers: HeadersInit = {}
  if (!auth) return headers

  if (auth.auth_type === "bearer" && auth.token) {
    const name = auth.header_name || "Authorization"
    headers[name] = `Bearer ${auth.token}`
  } else if (auth.auth_type === "basic" && auth.username && auth.password) {
    const creds = btoa(`${auth.username}:${auth.password}`)
    headers["Authorization"] = `Basic ${creds}`
  } else if (auth.auth_type === "apikey" && auth.token) {
    const name = auth.header_name || "Authorization"
    headers[name] = auth.token
  }
  return headers
}

// Always-Bearer auth for backend calls
function backendAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {}
  if (BACKEND_BEARER) headers["Authorization"] = `Bearer ${BACKEND_BEARER}`
  return headers
}

export function APIChecker() {
  // Session state (required by backend for most operations)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionDir, setSessionDir] = useState<string | null>(null)
  const [sessionBusy, setSessionBusy] = useState<boolean>(false)

  // Target base URL (the API to scan)
  const [baseUrl, setBaseUrl] = useState<string>("")

  // Auth configuration for target and secured backend endpoints
  const [auth, setAuth] = useState<AuthConfig>({ auth_type: "bearer", header_name: "Authorization" })
  const [showSecret, setShowSecret] = useState(false)

  // Auth Check state
  const [authCheckEndpoint, setAuthCheckEndpoint] = useState<string>("/")
  const [authCheckMethod, setAuthCheckMethod] = useState<string>("GET")
  const [authCheckTimeout, setAuthCheckTimeout] = useState<number>(20)
  const [authChecking, setAuthChecking] = useState<boolean>(false)
  const [authCheckResult, setAuthCheckResult] = useState<AuthCheckResult | null>(null)

  // Spec upload + endpoints
  const [uploading, setUploading] = useState(false)
  const [uploadedSpecName, setUploadedSpecName] = useState<string | null>(null)
  const [methodsFilter, setMethodsFilter] = useState<string[]>([...ALL_METHODS])
  const [endpoints, setEndpoints] = useState<EndpointOperation[]>([])
  const [selectedEndpoints, setSelectedEndpoints] = useState<Record<string, boolean>>({})
  const [endpointSearch, setEndpointSearch] = useState("")
  // Custom endpoint creator
  const [customMethod, setCustomMethod] = useState<string>("GET")
  const [customPath, setCustomPath] = useState<string>("")

  // Test selection
  const [selectedTests, setSelectedTests] = useState<string[]>([])


  // Execution config
  const [rateLimit, setRateLimit] = useState<number>(10)
  const [timeoutSec, setTimeoutSec] = useState<number>(30)

  // Scanning state/results
  const [isScanning, setIsScanning] = useState(false)
  const [scanReports, setScanReports] = useState<Array<{ key: string; request: any; report: ScanReport | null; error?: string }>>([])

  // Restore session from localStorage (if present)
  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? window.localStorage.getItem("api_scanner_session") : null
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed?.session_id) {
          setSessionId(parsed.session_id)
          setSessionDir(parsed.dir || null)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Derived
  const filteredEndpoints = useMemo(() => {
    const q = endpointSearch.trim().toLowerCase()
    return endpoints.filter((e) => {
      const m = e.method.toUpperCase()
      const inMethod = methodsFilter.includes(m)
      const inQuery = !q || e.path.toLowerCase().includes(q) || (e.summary || "").toLowerCase().includes(q)
      return inMethod && inQuery
    })
  }, [endpoints, endpointSearch, methodsFilter])

  const allVisibleSelected = useMemo(() => filteredEndpoints.every((e) => selectedEndpoints[`${e.method} ${e.path}`]), [filteredEndpoints, selectedEndpoints])

  // ===== Backend calls =====
  const uploadSpec = useCallback(async (file: File) => {
    setUploading(true)
    try {
      if (!sessionId) throw new Error("Create a session first")
      const form = new FormData()
      form.append("session_id", sessionId)
      form.append("file", file)
      const res = await fetch(`${API_BASE}/api/v1/spec/upload`, {
        method: "POST",
        headers: {
          ...backendAuthHeaders(),
        },
        body: form,
      })
      if (!res.ok) throw new Error(`Upload failed (${res.status})`)
      const data = await res.json().catch(() => ({}))
      // Try common fields where backends return filename
      const name = data?.filename || data?.name || data?.file || data?.meta?.filename || null
      setUploadedSpecName(name)
      return { ok: true as const, name }
    } catch (e: any) {
      return { ok: false as const, error: e?.message || String(e) }
    } finally {
      setUploading(false)
    }
  }, [auth, sessionId])

  const fetchExtractedEndpoints = useCallback(async () => {
    if (!sessionId) throw new Error("Create a session first")
    const params = new URLSearchParams()
    params.set("session_id", sessionId)
    if (uploadedSpecName) params.set("file", uploadedSpecName)
    if (methodsFilter.length && methodsFilter.length < ALL_METHODS.length) {
      // Backend may accept comma-separated
      params.set("methods", methodsFilter.join(","))
    }
    const res = await fetch(`${API_BASE}/api/v1/spec/endpoints${params.toString() ? `?${params.toString()}` : ""}`, {
      headers: {
        ...backendAuthHeaders(),
      },
    })
    if (!res.ok) throw new Error(`Failed to load endpoints (${res.status})`)
    const data = await res.json()
    // Try to normalize a few common shapes
    let ops: EndpointOperation[] = []
    if (Array.isArray(data)) {
      ops = data.map((d: any) => ({
        method: (d.method || d.httpMethod || d.verb || "GET").toString().toUpperCase(),
        path: d.path || d.endpoint || d.url || d.route || "/",
        summary: d.summary || d.description || "",
        operationId: d.operationId,
      }))
    } else if (Array.isArray(data?.endpoints)) {
      ops = data.endpoints.map((d: any) => ({
        method: (d.method || "GET").toString().toUpperCase(),
        path: d.path || d.endpoint || "/",
        summary: d.summary || "",
        operationId: d.operationId,
      }))
    }
    // Deduplicate
    const seen = new Set<string>()
    const unique = ops.filter((o) => {
      const k = `${o.method} ${o.path}`
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    setEndpoints(unique)
    // Preselect all by default
    const sel: Record<string, boolean> = {}
    unique.forEach((e) => (sel[`${e.method} ${e.path}`] = true))
    setSelectedEndpoints(sel)
  }, [auth, methodsFilter, uploadedSpecName, sessionId])

  // Auth Status Check
  const runAuthCheck = useCallback(async () => {
    setAuthChecking(true)
    setAuthCheckResult(null)
    try {
      const payload: AuthCheckRequest = {
        base_url: baseUrl,
        endpoint: authCheckEndpoint || "/",
        method: authCheckMethod || "GET",
        auth,
        timeout: authCheckTimeout || 20,
      }
      const res = await fetch(`${API_BASE}${AUTH_CHECK_PATH}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...backendAuthHeaders(),
        },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as Partial<AuthCheckResult> & { error?: string }
      if (!res.ok) {
        const errMsg = data?.error || `Auth check failed (${res.status})`
        setAuthCheckResult({
          target_url: "",
          method: payload.method || "GET",
          unauth_status: null,
          auth_status: null,
          requires_auth: false,
          is_authenticated: false,
          detected_auth_type: payload.auth?.auth_type || null,
          jwt_info: null,
          response_snippet: null,
          error: errMsg,
        })
        return
      }
      // Normalize minimal fields with sensible fallbacks
      const result: AuthCheckResult = {
        target_url: data.target_url || `${payload.base_url?.replace(/\/$/, "")}${(payload.endpoint || "/").startsWith("/") ? "" : "/"}${payload.endpoint || "/"}`,
        method: (data.method || payload.method || "GET") as string,
        unauth_status: typeof data.unauth_status === "number" ? data.unauth_status : null,
        auth_status: typeof data.auth_status === "number" ? data.auth_status : null,
        requires_auth: Boolean(data.requires_auth),
        is_authenticated: Boolean(data.is_authenticated),
        detected_auth_type: (data.detected_auth_type as any) ?? payload.auth?.auth_type ?? null,
        jwt_info: (data.jwt_info as any) || null,
        response_snippet: (data.response_snippet as any) || null,
        error: (data.error as any) || null,
      }
      setAuthCheckResult(result)
    } catch (err: any) {
      setAuthCheckResult({
        target_url: "",
        method: authCheckMethod,
        unauth_status: null,
        auth_status: null,
        requires_auth: false,
        is_authenticated: false,
        detected_auth_type: auth.auth_type,
        jwt_info: null,
        response_snippet: null,
        error: err?.message || String(err),
      })
    } finally {
      setAuthChecking(false)
    }
  }, [API_BASE, AUTH_CHECK_PATH, baseUrl, authCheckEndpoint, authCheckMethod, authCheckTimeout, auth])

  const runEndpointScan = useCallback(
    async (endpoint: EndpointOperation) => {
      // Map selected test labels to backend codes
      const selectedTestCodes = selectedTests.map((t) => TEST_CODE_BY_LABEL[t] || t)
      const body = {
        base_url: baseUrl,
        endpoint: endpoint.path,
        method: endpoint.method,
        selected_tests: selectedTestCodes,
        openapi_path: uploadedSpecName || null,
        auth,
        rate_limit: rateLimit,
        timeout: timeoutSec,
        session_id: sessionId,
      }
      const res = await fetch(`${API_BASE}/api/v1/scan/endpoint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...backendAuthHeaders(),
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`Endpoint scan failed (${res.status})`)
      const data = (await res.json()) as any
      return normalizeReport(data)
    },
    [auth, baseUrl, rateLimit, selectedTests, timeoutSec, uploadedSpecName, sessionId]
  )

  const runFullScan = useCallback(async () => {
    if (!sessionId) throw new Error("Create a session first")
    const selected = Object.entries(selectedEndpoints)
      .filter(([, v]) => v)
      .map(([k]) => {
        const [, path] = k.split(" ")
        return path
      })

    // Map selected test labels to backend codes
    const selectedTestCodes = selectedTests.map((t) => TEST_CODE_BY_LABEL[t] || t)

    const body: any = {
      base_url: baseUrl,
      endpoints: selected.length > 0 ? selected : undefined,
      method: "GET",
      selected_tests: selectedTestCodes,
      openapi_path: uploadedSpecName || null,
      auth,
      rate_limit: rateLimit,
      timeout: timeoutSec,
      session_id: sessionId,
    }
    const res = await fetch(`${API_BASE}/api/v1/scan/full`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...backendAuthHeaders(),
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`Full scan failed (${res.status})`)
    const data = (await res.json()) as any
    return normalizeReport(data)
  }, [auth, baseUrl, rateLimit, selectedEndpoints, timeoutSec, uploadedSpecName, sessionId])

  // ===== Session management =====
  const createSession = useCallback(async () => {
    setSessionBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/sessions`, {
        method: "POST",
        headers: {
          ...backendAuthHeaders(),
        },
      })
      if (!res.ok) throw new Error(`Failed to create session (${res.status})`)
      const data = (await res.json()) as { session_id: string; dir?: string }
      setSessionId(data.session_id)
      setSessionDir(data.dir || null)
      try {
        window.localStorage.setItem("api_scanner_session", JSON.stringify({ session_id: data.session_id, dir: data.dir || null }))
      } catch { }
    } finally {
      setSessionBusy(false)
    }
  }, [])

  const deleteSession = useCallback(async () => {
    if (!sessionId) return
    setSessionBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/v1/sessions/${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
        headers: {
          ...backendAuthHeaders(),
        },
      })
      if (!res.ok) throw new Error(`Failed to delete session (${res.status})`)
      // Clear session-scoped state
      setSessionId(null)
      setSessionDir(null)
      setUploadedSpecName(null)
      setEndpoints([])
      setSelectedEndpoints({})
      setScanReports([])
      try {
        window.localStorage.removeItem("api_scanner_session")
      } catch { }
    } finally {
      setSessionBusy(false)
    }
  }, [sessionId])

  // ===== UI Actions =====
  const handleSelectAllVisible = (checked: boolean) => {
    const next = { ...selectedEndpoints }
    filteredEndpoints.forEach((e) => {
      next[`${e.method} ${e.path}`] = checked
    })
    setSelectedEndpoints(next)
  }

  const toggleEndpoint = (key: string, checked: boolean | string) => {
    setSelectedEndpoints((prev) => ({ ...prev, [key]: !!checked }))
  }

  const handleUploadInput = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const up = await uploadSpec(file)
    if (up.ok) {
      // Auto-fetch endpoints
      try {
        await fetchExtractedEndpoints()
      } catch (err) {
        // swallow, shown in UI when needed
      }
    }
  }

  const addCustomEndpoint = () => {
    const method = (customMethod || "GET").toUpperCase()
    let path = (customPath || "").trim()
    if (!path) return
    // Normalize: ensure relative path starts with '/'
    const isAbsolute = /^(https?:)?\/\//i.test(path)
    if (!isAbsolute && !path.startsWith("/")) {
      path = "/" + path
    }
    const key = `${method} ${path}`
    // Deduplicate
    const exists = endpoints.some((e) => `${e.method} ${e.path}` === key)
    if (exists) {
      // Just ensure it's selected
      setSelectedEndpoints((prev) => ({ ...prev, [key]: true }))
      setCustomPath("")
      return
    }
    const newEp: EndpointOperation = { method, path, summary: "Custom endpoint" }
    setEndpoints((prev) => [...prev, newEp])
    setSelectedEndpoints((prev) => ({ ...prev, [key]: true }))
    setCustomPath("")
  }

  const scanSelectedEndpoints = async () => {
    setIsScanning(true)
    setScanReports([])
    try {
      // Always use all selected endpoints, regardless of current filters/search
      const list = endpoints.filter((e) => selectedEndpoints[`${e.method} ${e.path}`])
      const results: Array<{ key: string; request: any; report: ScanReport | null; error?: string }> = []
      for (const ep of list) {
        const key = `${ep.method} ${ep.path}`
        try {
          const report = await runEndpointScan(ep)
          results.push({ key, request: ep, report })
        } catch (err: any) {
          results.push({ key, request: ep, report: null, error: err?.message || String(err) })
        }
      }
      setScanReports(results)
    } finally {
      setIsScanning(false)
    }
  }

  const scanFull = async () => {
    setIsScanning(true)
    setScanReports([])
    try {
      const report = await runFullScan()
      setScanReports([{ key: "full-scan", request: { type: "full" }, report }])
    } catch (err: any) {
      setScanReports([{ key: "full-scan", request: { type: "full" }, report: null, error: err?.message || String(err) }])
    } finally {
      setIsScanning(false)
    }
  }

  // Normalize a backend report into our UI-friendly ScanReport shape
  function normalizeReport(data: any): ScanReport {
    const findings = Array.isArray(data?.findings)
      ? data.findings.map((f: any) => normalizeFinding(f))
      : Array.isArray(data?.data?.findings)
        ? data.data.findings.map((f: any) => normalizeFinding(f))
        : []

    const scan_start = data?.scan_start || data?.started_at || new Date().toISOString()
    const scan_end = data?.scan_end || data?.finished_at || null
    const endpoints_tested = data?.endpoints_tested ?? data?.summary?.endpoints_tested
    const requests_made = data?.requests_made ?? data?.summary?.requests

    return {
      target: data?.target || data?.base_url || baseUrl,
      scan_start,
      scan_end,
      findings,
      endpoints_tested,
      requests_made,
    }
  }

  function normalizeFinding(f: any): Finding {
    const code = (f?.vuln_type || f?.type || f?.code || "").toString()
    const label = Object.entries(TEST_CODE_BY_LABEL).find(([, v]) => v === code)?.[0] || f?.vuln_type || f?.type || code
    const endpoint = f?.endpoint || f?.path || f?.url || ""
    const severity = (f?.severity || f?.level || "INFO").toString().toUpperCase() as SeverityLevel
    const description = f?.description || f?.detail || f?.message || ""
    const remediation = f?.remediation || f?.recommendation || ""
    return {
      vuln_type: label as VulnerabilityType,
      severity,
      endpoint,
      description,
      remediation,
      evidence: f?.evidence,
      timestamp: f?.timestamp || f?.time || undefined,
    }
  }



  // ===== Render =====
  return (
    <div className="space-y-6">
      <ServiceStatusIndicator
        url={`${API_BASE}/health`}
        serviceName="API Tester"
        variant="alert"
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
            <Zap className="h-8 w-8 text-primary" />
            API Vulnerability Scanner
          </h1>
          <p className="text-muted-foreground">Upload your OpenAPI spec, configure auth, choose endpoints and tests, then scan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: Session + Target + Auth + Spec */}
        <div className="space-y-6 xl:col-span-1">
          {/* Session Management */}
          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
              <CardDescription>Create a session before uploading specs or scanning</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button className="gap-2" onClick={createSession} disabled={!!sessionId || sessionBusy}>
                  {sessionBusy && !sessionId ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />}
                  {sessionId ? "Session Active" : "Create Session"}
                </Button>
                <Button variant="destructive" className="gap-2" onClick={deleteSession} disabled={!sessionId || sessionBusy}>
                  {sessionBusy && sessionId ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  Delete Session
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                {sessionId ? (
                  <div className="space-y-1">
                    <div><span className="font-medium text-foreground">ID:</span> <span className="font-mono break-all">{sessionId}</span></div>
                    {sessionDir && <div><span className="font-medium text-foreground">Dir:</span> <span className="font-mono break-all">{sessionDir}</span></div>}
                  </div>
                ) : (
                  <p>No session. Create one to start.</p>
                )}
              </div>
            </CardContent>
          </Card>
          {/* Target API */}
          <Card>
            <CardHeader>
              <CardTitle>Target API</CardTitle>
              <CardDescription>Base URL of the API you want to assess</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Base URL</label>
                <Input
                  placeholder="https://api.example.com"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-2">This URL is sent to the scanner as the target.</p>
              </div>
            </CardContent>
          </Card>

          {/* Authentication */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
              <CardDescription>Optional. If provided, requests will include credentials.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Auth Type</label>
                <Select
                  value={auth.auth_type}
                  onValueChange={(v: AuthType) => setAuth((prev) => ({ ...prev, auth_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="apikey">API Key (Header)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {auth.auth_type === "bearer" && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Token</label>
                  <div className="flex gap-2">
                    <Input
                      type={showSecret ? "text" : "password"}
                      placeholder="eyJhbGci..."
                      value={auth.token || ""}
                      onChange={(e) => setAuth((p) => ({ ...p, token: e.target.value }))}
                    />
                    <Button variant="outline" onClick={() => setShowSecret((s) => !s)} className="px-3">
                      {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </div>
                  <div className="mt-3">
                    <label className="text-sm font-medium mb-2 block">Header Name</label>
                    <Input
                      placeholder="Authorization"
                      value={auth.header_name || ""}
                      onChange={(e) => setAuth((p) => ({ ...p, header_name: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {auth.auth_type === "basic" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Username</label>
                    <Input
                      placeholder="user"
                      value={auth.username || ""}
                      onChange={(e) => setAuth((p) => ({ ...p, username: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Password</label>
                    <Input
                      type={showSecret ? "text" : "password"}
                      placeholder="••••••••"
                      value={auth.password || ""}
                      onChange={(e) => setAuth((p) => ({ ...p, password: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {auth.auth_type === "apikey" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-2 block">API Key</label>
                    <Input
                      type={showSecret ? "text" : "password"}
                      placeholder="your-api-key"
                      value={auth.token || ""}
                      onChange={(e) => setAuth((p) => ({ ...p, token: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-2 block">Header Name</label>
                    <Input
                      placeholder="X-API-Key"
                      value={auth.header_name || ""}
                      onChange={(e) => setAuth((p) => ({ ...p, header_name: e.target.value }))}
                    />
                  </div>
                </div>
              )}

              {/* Auth Status Checker */}
              <div className="pt-2 border-t border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium block">Authentication Status Checker</label>
                    <p className="text-xs text-muted-foreground">Probe an endpoint to verify credentials and auth requirements.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium mb-2 block">Endpoint</label>
                    <Input
                      placeholder="/me or https://api.example.com/me"
                      value={authCheckEndpoint}
                      onChange={(e) => setAuthCheckEndpoint(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Method</label>
                    <Select value={authCheckMethod} onValueChange={(v) => setAuthCheckMethod(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ALL_METHODS.map((m) => (
                          <SelectItem key={`auth-m-${m}`} value={m}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Timeout (s)</label>
                    <Input
                      type="number"
                      min={5}
                      max={300}
                      value={authCheckTimeout}
                      onChange={(e) => setAuthCheckTimeout(Number(e.target.value || 20))}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    className="gap-2"
                    onClick={runAuthCheck}
                    disabled={authChecking || !baseUrl}
                  >
                    {authChecking ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                    Test authentication
                  </Button>
                  <p className="text-xs text-muted-foreground">Uses base URL above; endpoint can be relative or absolute.</p>
                </div>

                {authCheckResult && (
                  <div className="rounded border border-border p-3 space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {authCheckResult.target_url && (
                        <span className="px-2 py-1 rounded bg-muted">{authCheckResult.target_url}</span>
                      )}
                      {authCheckResult.method && (
                        <Badge variant="secondary">{authCheckResult.method}</Badge>
                      )}
                      {typeof authCheckResult.unauth_status === "number" && (
                        <Badge variant="outline">Unauth: {authCheckResult.unauth_status}</Badge>
                      )}
                      {typeof authCheckResult.auth_status === "number" && (
                        <Badge variant="outline">Auth: {authCheckResult.auth_status}</Badge>
                      )}
                      <Badge variant={authCheckResult.requires_auth ? "default" : "secondary"}>
                        requires_auth: {String(authCheckResult.requires_auth)}
                      </Badge>
                      <Badge variant={authCheckResult.is_authenticated ? "default" : "secondary"}>
                        is_authenticated: {String(authCheckResult.is_authenticated)}
                      </Badge>
                      {authCheckResult.detected_auth_type && (
                        <Badge variant="secondary">type: {String(authCheckResult.detected_auth_type)}</Badge>
                      )}
                    </div>
                    {authCheckResult.jwt_info && (
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="font-medium text-foreground">JWT (decoded, unverified)</div>
                        {authCheckResult.jwt_info.header && (
                          <pre className="whitespace-pre-wrap break-all bg-muted/50 p-2 rounded">{JSON.stringify(authCheckResult.jwt_info.header, null, 2)}</pre>
                        )}
                        {authCheckResult.jwt_info.claims && (
                          <pre className="whitespace-pre-wrap break-all bg-muted/50 p-2 rounded">{JSON.stringify(authCheckResult.jwt_info.claims, null, 2)}</pre>
                        )}
                      </div>
                    )}
                    {authCheckResult.response_snippet && (
                      <div className="text-xs">
                        <div className="font-medium text-foreground">Response snippet</div>
                        <pre className="whitespace-pre-wrap break-all bg-muted/50 p-2 rounded">{authCheckResult.response_snippet}</pre>
                      </div>
                    )}
                    {authCheckResult.error && (
                      <div className="text-xs text-red-500">{authCheckResult.error}</div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* OpenAPI Spec */}
          <Card>
            <CardHeader>
              <CardTitle>OpenAPI Specification</CardTitle>
              <CardDescription>Upload a JSON or YAML OpenAPI 3.x file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors">
                <input
                  id="openapi-upload"
                  type="file"
                  accept=".json,.yaml,.yml"
                  className="hidden"
                  onChange={handleUploadInput}
                />
                <label htmlFor="openapi-upload" className={`cursor-pointer block ${!sessionId ? "pointer-events-none opacity-60" : ""}`}>
                  <Upload size={24} className="mx-auto mb-2 text-accent" />
                  <p className="text-sm font-medium">
                    {uploadedSpecName ? uploadedSpecName : "Drag and drop or click to upload spec"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Max 10MB • JSON/YAML</p>
                  {!sessionId && <p className="text-xs text-red-500 mt-2">Create a session to enable upload</p>}
                </label>
              </div>
              <div className="flex gap-2">
                <Button onClick={fetchExtractedEndpoints} variant="outline" disabled={uploading || !sessionId} className="gap-2">
                  {uploading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Load Endpoints
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Middle column: Endpoints & Tests */}
        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Endpoints</CardTitle>
              <CardDescription>Select which operations to test</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add custom endpoint */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Method</label>
                  <Select value={customMethod} onValueChange={(v) => setCustomMethod(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_METHODS.map((m) => (
                        <SelectItem key={`custom-m-${m}`} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="lg:col-span-2">
                  <label className="text-sm font-medium mb-2 block">Endpoint Path or URL</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="/users/{id} or https://api.example.com/users/1"
                      value={customPath}
                      onChange={(e) => setCustomPath(e.target.value)}
                    />
                    <Button
                      className="whitespace-nowrap"
                      onClick={addCustomEndpoint}
                      disabled={!customPath.trim()}
                    >
                      <PlusCircle className="mr-2" size={16} /> Add Endpoint
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Adding an endpoint only updates the list; it doesn’t send any requests.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Filter by path or summary"
                      className="pl-9"
                      value={endpointSearch}
                      onChange={(e) => setEndpointSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {ALL_METHODS.map((m) => (
                    <div key={m} className="flex items-center gap-2">
                      <Checkbox
                        id={`method-${m}`}
                        checked={methodsFilter.includes(m)}
                        onCheckedChange={(c) =>
                          setMethodsFilter((prev) => (c ? Array.from(new Set([...prev, m])) : prev.filter((x) => x !== m)))
                        }
                      />
                      <label htmlFor={`method-${m}`} className="text-xs cursor-pointer">
                        {m}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{filteredEndpoints.length} endpoints</p>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => handleSelectAllVisible(!allVisibleSelected)}>
                    {allVisibleSelected ? "Deselect Visible" : "Select Visible"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedEndpoints({})}>
                    Clear All
                  </Button>
                </div>
              </div>

              <ScrollArea className="h-80 w-full rounded-md border border-border p-3">
                <div className="space-y-2">
                  {filteredEndpoints.map((ep) => {
                    const key = `${ep.method} ${ep.path}`
                    const checked = !!selectedEndpoints[key]
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-3 p-2 rounded border ${checked ? "border-accent/60 bg-accent/5" : "border-border"}`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox checked={checked} onCheckedChange={(c) => toggleEndpoint(key, c)} id={key} />
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={ep.method === "GET" ? "secondary" : ep.method === "POST" ? "default" : "outline"}>
                                {ep.method}
                              </Badge>
                              <span className="text-sm font-mono break-all">{ep.path}</span>
                            </div>
                            {ep.summary && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ep.summary}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {filteredEndpoints.length === 0 && (
                    <p className="text-sm text-muted-foreground">Upload a spec and click "Load Endpoints" to begin.</p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vulnerability Tests</CardTitle>
              <CardDescription>Choose test types to include when scanning endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTests([...VULN_TESTS])}
                >
                  Select All
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTests([])}>
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {VULN_TESTS.map((t) => (
                  <label key={t} className={`flex items-center gap-2 p-2 rounded border ${selectedTests.includes(t) ? "border-accent/60 bg-accent/5" : "border-border"}`}>
                    <Checkbox
                      checked={selectedTests.includes(t)}
                      onCheckedChange={(c) =>
                        setSelectedTests((prev) => (c ? Array.from(new Set([...prev, t])) : prev.filter((x) => x !== t)))
                      }
                    />
                    <span className="text-sm">{t}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Scan Controls */}
          <Card>
            <CardHeader>
              <CardTitle>Scan Controls</CardTitle>
              <CardDescription>Adjust performance and run scans</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">Rate Limit (req/s): {rateLimit}</label>
                  <Slider value={[rateLimit]} onValueChange={(v) => setRateLimit(v[0])} min={1} max={100} step={1} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Timeout (seconds)</label>
                  <Input
                    type="number"
                    min={5}
                    max={300}
                    value={timeoutSec}
                    onChange={(e) => setTimeoutSec(Number(e.target.value || 30))}
                  />
                </div>

              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  className="gap-2"
                  onClick={scanSelectedEndpoints}
                  disabled={
                    isScanning ||
                    !baseUrl ||
                    !sessionId ||
                    endpoints.every((e) => !selectedEndpoints[`${e.method} ${e.path}`])
                  }
                >
                  {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  Scan Selected Endpoints
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={scanFull}
                  disabled={isScanning || !baseUrl || !sessionId}
                >
                  {isScanning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                  Full Scan (Backend Defaults)
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Notes:
                <br />• Single endpoint request includes its own method.
                <br />• Multi-endpoint request sends the same method for all selected endpoints.
              </p>
            </CardContent>
          </Card>

          {/* Results */}
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>Aggregated reports from your scans</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scanReports.length === 0 && (
                <p className="text-sm text-muted-foreground">No results yet. Run a scan to see findings.</p>
              )}

              {scanReports.map((entry) => (
                <div key={entry.key} className="rounded border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{entry.key}</Badge>
                      {entry.report && (
                        <span className="text-xs text-muted-foreground">{new Date(entry.report.scan_start).toLocaleString()}</span>
                      )}
                    </div>
                    {!entry.report && entry.error && <span className="text-xs text-red-500">{entry.error}</span>}
                  </div>

                  {entry.report && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {typeof entry.report.endpoints_tested === "number" && (
                          <Badge variant="secondary">Endpoints tested: {entry.report.endpoints_tested}</Badge>
                        )}
                        {typeof entry.report.requests_made === "number" && (
                          <Badge variant="secondary">Requests: {entry.report.requests_made}</Badge>
                        )}
                        {entry.report.scan_end && (
                          <Badge variant="secondary">Finished: {new Date(entry.report.scan_end).toLocaleString()}</Badge>
                        )}
                      </div>

                      {(entry.report.findings?.length || 0) === 0 && (
                        <p className="text-sm text-muted-foreground">No findings reported.</p>
                      )}

                      <div className="space-y-2">
                        {entry.report.findings?.map((f, idx) => (
                          <div key={idx} className="p-3 rounded border border-border">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge>{f.severity}</Badge>
                                <span className="text-sm font-medium">{f.vuln_type}</span>
                              </div>
                              <span className="text-xs font-mono">{f.endpoint}</span>
                            </div>
                            <p className="text-sm mt-2">{f.description}</p>
                            {f.remediation && (
                              <p className="text-xs text-muted-foreground mt-1">Remediation: {f.remediation}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
