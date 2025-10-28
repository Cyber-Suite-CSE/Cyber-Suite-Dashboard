"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Pause,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* -------------------------------------------------------------------------- */
/*                                  TypeDefs                                  */
/* -------------------------------------------------------------------------- */

type ScanStatus = "idle" | "running" | "completed" | "stopped";

interface ScanResultsProps {
  sessionId: string;
  autoStart?: boolean;
  connectionInfo: {
    engine: string;
    connection: {
      host: string;
      port: number;
      user: string;
      password: string;
      database: string;
    };
  } | null;
  argsPayload: Record<string, any> | null;
  selectedTests: string[];
}

interface ScanIssue {
  check_id: string;
  status: "pass" | "fail" | "warn" | "error" | string;
  message: string;
  severity: "critical" | "high" | "medium" | "low" | string;
  evidence?: Record<string, any>;
  article_refs?: string[];
}

/* -------------------------------------------------------------------------- */
/*                                  Constants                                 */
/* -------------------------------------------------------------------------- */

const COLORS: Record<string, string> = {
  pass: "#16a34a",
  fail: "#dc2626",
  warn: "#d97706",
  error: "#991b1b",
};

/* -------------------------------------------------------------------------- */
/*                              Cache Management                              */
/* -------------------------------------------------------------------------- */

const cacheKey = (sessionId: string) => `scan:${sessionId}`;

type CachedState = {
  scanStatus: ScanStatus;
  progress: number;
  issues: ScanIssue[];
  selectedTests: string[];
  connectionInfo?: ScanResultsProps["connectionInfo"];
  argsPayload?: ScanResultsProps["argsPayload"];
  savedAt: number;
};

function loadCache(sessionId: string): CachedState | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(sessionId));
    return raw ? (JSON.parse(raw) as CachedState) : null;
  } catch {
    return null;
  }
}

function saveCache(sessionId: string, state: CachedState) {
  try {
    sessionStorage.setItem(
      cacheKey(sessionId),
      JSON.stringify({ ...state, savedAt: Date.now() })
    );
  } catch {
    /* ignore */
  }
}

/* -------------------------------------------------------------------------- */
/*                             Evidence Subtable                              */
/* -------------------------------------------------------------------------- */

function EvidenceTable({ data }: { data?: Record<string, any> }) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return (
      <pre className="text-xs max-h-40 overflow-auto rounded-md bg-gray-100 p-2 whitespace-pre-wrap break-words">
        {data ? JSON.stringify(data, null, 2) : "N/A"}
      </pre>
    );
  }

  const entries = Object.entries(data);
  if (!entries.length)
    return <div className="text-sm text-muted-foreground">N/A</div>;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 rounded-md">
        <thead>
          <tr className="bg-gray-50">
            <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2 border-b border-gray-200 w-1/4">
              Field
            </th>
            <th className="text-left text-xs font-semibold text-gray-600 px-3 py-2 border-b border-gray-200">
              Value
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([k, v]) => (
            <tr key={k} className="align-top">
              <td className="px-3 py-2 text-sm font-medium text-gray-800 border-t break-words">
                {k}
              </td>
              <td className="px-3 py-2 text-sm text-gray-800 border-t">
                {typeof v === "object" ? (
                  <pre className="text-xs bg-gray-100 rounded p-2 whitespace-pre-wrap break-words overflow-auto">
                    {JSON.stringify(v, null, 2)}
                  </pre>
                ) : (
                  String(v)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Main Component                              */
/* -------------------------------------------------------------------------- */

export function ScanResults({
  sessionId,
  autoStart = false,
  connectionInfo,
  selectedTests,
  argsPayload,
}: ScanResultsProps) {
  const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [issues, setIssues] = useState<ScanIssue[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isStopping, setIsStopping] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const stoppedByUserRef = useRef(false);
  const hasStartedRef = useRef(false);

  /* ----------------------------- Derived Helpers ----------------------------- */
  const calcProgress = (count: number) =>
    selectedTests.length
      ? Math.min(Math.round((count / selectedTests.length) * 100), 100)
      : 0;

  const toggleRow = (id: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /* ------------------------------ Initialization ----------------------------- */
  useEffect(() => {
    const cached = loadCache(sessionId);
    if (cached) {
      setScanStatus(cached.scanStatus);
      setProgress(cached.progress);
      setIssues(cached.issues ?? []);
    }

    if (autoStart && !hasStartedRef.current) {
      hasStartedRef.current = true;
      startScan();
    }

    return () => {
      try {
        wsRef.current?.close();
      } catch {}
      wsRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    saveCache(sessionId, {
      scanStatus,
      progress,
      issues,
      selectedTests,
      connectionInfo,
      argsPayload,
      savedAt: Date.now(),
    });
  }, [sessionId, scanStatus, progress, issues, selectedTests, connectionInfo, argsPayload]);

  /* ------------------------------- Core Logic ------------------------------- */

  const startScan = () => {
  if (!connectionInfo) {
    console.error("❌ Missing connection info — cannot start scan.");
    return;
  }

  setScanStatus("running");
  setProgress(0);
  setIssues([]);
  setExpandedRows(new Set());
  setIsStopping(false);
  stoppedByUserRef.current = false;

  // ✅ Use absolute URL (and ensure no https/ws mismatch)
  const ws = new WebSocket("ws://localhost:8080/v1/scan-stream");
  wsRef.current = ws;

  const payload = {
    engine: connectionInfo.engine,
    connection: connectionInfo.connection,
    checks: selectedTests,
    args: argsPayload,
  };

  console.log("🚀 Opening WebSocket connection…");

  // ✅ Delay sending payload slightly to avoid race-condition close
  ws.onopen = () => {
    console.log("✅ WebSocket opened, sending payload in 100ms…");
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(payload));
        console.log("📦 Payload sent:", payload);
      } else {
        console.warn("⚠️ WebSocket not open when trying to send payload");
      }
    }, 100);
  };

  ws.onmessage = (event) => {
    if (stoppedByUserRef.current) return;

    try {
      const data = JSON.parse(event.data);
      console.log("📥 Received from WS:", data);

      setIssues((prev) => {
        let next = prev;
        if (Array.isArray(data.issues)) {
          next = data.issues;
        } else if (data.check_id) {
          const idx = prev.findIndex((i) => i.check_id === data.check_id);
          next =
            idx === -1
              ? [...prev, data]
              : prev.map((i) =>
                  i.check_id === data.check_id ? { ...i, ...data } : i
                );
        }

        const byCount = calcProgress(next.length);
        setProgress((p) => Math.max(p, byCount));

        // ✅ When "done" message arrives, mark completed
        if (data.status === "done") {
          setScanStatus("completed");
          ws.close(1000, "Completed successfully");
        }
        return next;
      });

      // ✅ Handle progress explicitly if server sends it
      if (typeof data.progress === "number") {
        const p = Math.max(0, Math.min(100, data.progress));
        setProgress((prev) => Math.max(prev, p));
      }
    } catch (err) {
      console.error("❌ WebSocket parse error:", err, event.data);
    }
  };

  ws.onerror = (err) => {
    console.error("❌ WebSocket error:", err);
    if (!stoppedByUserRef.current) {
      setScanStatus("stopped");
    }
  };

  ws.onclose = (event) => {
    console.warn(`⚠️ WebSocket closed (code=${event.code}, reason=${event.reason || "none"})`);
    if (stoppedByUserRef.current) {
      setIsStopping(false);
      return;
    }
    if (scanStatus === "running") setScanStatus("completed");
    setProgress((p) => (p < 100 ? p : 100));
  };
};


  const handleStop = () => {
    if (scanStatus !== "running" || isStopping) return;

    stoppedByUserRef.current = true;
    setIsStopping(true);
    setScanStatus("stopped");

    const ws = wsRef.current;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      try {
        ws.close();
      } catch {}
    }
    wsRef.current = null;
  };

  /* ------------------------------- UI Helpers ------------------------------- */

  const getStatusIcon = (s: string) => {
    switch (s.toLowerCase()) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "fail":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "warn":
        return <AlertTriangle className="h-4 w-4 text-amber-600" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-800" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getSeverityVariant = (sev: string) => {
    switch (sev.toLowerCase()) {
      case "critical":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "medium":
        return "bg-yellow-100 text-yellow-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const statusCounts = issues.reduce(
    (acc, { status }) => {
      const k = (status || "").toLowerCase();
      if (k in acc) (acc as any)[k] += 1;
      return acc;
    },
    { pass: 0, fail: 0, warn: 0, error: 0 }
  );

  const pieData = Object.entries(statusCounts)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  /* -------------------------------------------------------------------------- */
  /*                                    Render                                  */
  /* -------------------------------------------------------------------------- */

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {(scanStatus === "running" || scanStatus === "stopped") && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  {scanStatus === "running" ? (
                    <>
                      <Clock className="h-5 w-5 animate-spin" />
                      Scan in Progress
                    </>
                  ) : (
                    <>
                      <Pause className="h-5 w-5" />
                      Scan Stopped
                    </>
                  )}
                </CardTitle>
                <CardDescription>
                  {scanStatus === "running"
                    ? "Running security tests on your database..."
                    : `Scan stopped at ${progress}% completion.`}
                </CardDescription>
              </div>

              {scanStatus === "running" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStop}
                  disabled={isStopping}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  {isStopping ? "Stopping…" : "Stop Scan"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              {progress}% complete
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {scanStatus === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>Final distribution of results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" aspect={1}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius="50%"
                    outerRadius="80%"
                    label={({ name, percent }) =>
                      `${name.toUpperCase()} ${Math.round(percent * 100)}%`
                    }
                  >
                    {pieData.map(({ name }, i) => (
                      <Cell key={i} fill={COLORS[name]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      {scanStatus !== "idle" && (
        <Card>
          <CardHeader>
            <CardTitle>
              {scanStatus === "running" ? "Live Results" : "Results"}
            </CardTitle>
            <CardDescription>
              {issues.length === 0
                ? scanStatus === "running"
                  ? "Waiting for first result…"
                  : "No results received."
                : "Click a row to expand details"}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-auto max-h-[480px]">
            {issues.length === 0 ? (
              <p className="text-muted-foreground text-center p-4">
                No issues yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {issues.map((issue) => {
                    const isExpanded = expandedRows.has(issue.check_id);
                    return (
                      <React.Fragment key={issue.check_id}>
                        <TableRow
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleRow(issue.check_id)}
                        >
                          <TableCell className="font-medium">
                            {issue.check_id}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(issue.status)}
                              <span className="capitalize">
                                {issue.status.toLowerCase()}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getSeverityVariant(issue.severity)}
                            >
                              {issue.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            {isExpanded ? (
                              <ChevronUp className="h-5 w-5 mx-auto" />
                            ) : (
                              <ChevronDown className="h-5 w-5 mx-auto" />
                            )}
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow className="bg-muted">
                            <TableCell colSpan={4} className="p-4">
                              <div className="mb-2">
                                <strong>Message:</strong> {issue.message}
                              </div>
                              <div className="mb-2">
                                <strong>Evidence:</strong>
                                <EvidenceTable data={issue.evidence} />
                              </div>
                              <div>
                                <strong>Article References:</strong>{" "}
                                {issue.article_refs?.length
                                  ? issue.article_refs.join(", ")
                                  : "N/A"}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {scanStatus === "idle" && (
        <p className="text-center text-muted-foreground">
          No scan running currently.
        </p>
      )}
    </div>
  );
}
