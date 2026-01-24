"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Settings, BarChart3 } from "lucide-react";
import { DatabaseConnection } from "./database-scanner/database-connection";
import { ScanConfiguration } from "./database-scanner/scan-configuration";
import { ScanResults } from "./database-scanner/scan-results";

type ConnectionStatus = "idle" | "connected" | "failed";

export function DatabaseScanner() {
  const [activeTab, setActiveTab] = useState("connection");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("idle");
  const [connectedDb, setConnectedDb] = useState<string>("");
  const [connectionInfo, setConnectionInfo] = useState<any>(null);
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [argsPayload, setArgsPayload] = useState<Record<string, any> | null>(
    null,
  );
  const [runId, setRunId] = useState<string | null>(null);
  const [shouldAutoStart, setShouldAutoStart] = useState(false);

  // Backend connection state
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isCheckingBackend, setIsCheckingBackend] = useState(true);

  const handleConnection = (status: ConnectionStatus, dbInfo?: any) => {
    setConnectionStatus(status);
    if (status === "connected" && dbInfo) {
      setConnectedDb(`${dbInfo.database}@${dbInfo.host}:${dbInfo.port}`);
      setConnectionInfo({
        engine: dbInfo.engine,
        connection: {
          host: dbInfo.host,
          port: dbInfo.port,
          user: dbInfo.username,
          password: dbInfo.password,
          database: dbInfo.database,
        },
      });
      setActiveTab("configuration");
    } else {
      setConnectedDb("");
      setConnectionInfo(null);
      setSelectedTests([]);
      setArgsPayload(null);
      setRunId(null);
      setShouldAutoStart(false);
      setActiveTab("connection");
    }
  };

  const handleSelectedTestsChange = (tests: string[]) => {
    setSelectedTests(tests);
  };

  const canNavigateTo = (screenId: string) => {
    switch (screenId) {
      case "connection":
        return true;
      case "configuration":
        return connectionStatus === "connected";
      case "results":
        return (
          connectionStatus === "connected" &&
          !!runId &&
          selectedTests.length > 0 &&
          !!argsPayload
        );
      default:
        return false;
    }
  };

  const handleNavigation = (screenId: string) => {
    if (canNavigateTo(screenId)) {
      setActiveTab(screenId);
    }
  };

  const handleRunScan = (args: Record<string, any>) => {
    setArgsPayload(args);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setRunId(id);
    setShouldAutoStart(true);
    setActiveTab("results");
  };

  const checkBackendHealth = async () => {
    setIsCheckingBackend(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_DATABASE_SCANNER_URL!;
      // Ensure we don't have double slashes if base has one
      const url = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

      const response = await fetch(url);
      if (response.ok) {
        setIsBackendConnected(true);
        setBackendError(null);
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Backend health check failed:", error);
      setIsBackendConnected(false);
      setBackendError(error instanceof Error ? error.message : "Connection failed");
    } finally {
      setIsCheckingBackend(false);
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, []);

  return (
    <div className="space-y-6">
      {/* Backend Connection Status */}
      {isCheckingBackend ? (
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <div>
            <h5 className="font-medium leading-none tracking-tight">Connecting to Backend...</h5>
            <div className="text-sm text-muted-foreground mt-1">Checking scanner availability...</div>
          </div>
        </div>
      ) : !isBackendConnected ? (
        <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive flex items-start gap-3">
          <div className="mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-circle"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
          </div>
          <div className="flex-1">
            <h5 className="font-medium leading-none tracking-tight">Backend Connection Failed</h5>
            <div className="text-sm opacity-90 mt-1">
              {backendError || "Cannot connect to database scanner service"}
              <br />
              <span className="text-xs mt-2 block opacity-75">
                Ensure the Database Scanner container is running on port 8002
              </span>
            </div>
            <button
              onClick={checkBackendHealth}
              className="mt-3 inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3"
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-start gap-3">
          <div className="mt-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check-circle text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
          </div>
          <div>
            <h5 className="font-medium leading-none tracking-tight">Backend Connected</h5>
            <div className="text-sm text-muted-foreground mt-1">Database Scanner service is ready</div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Database Scanner
        </h1>
        <p className="text-muted-foreground">
          Discover and analyze database services with comprehensive security
          testing
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleNavigation}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger
            value="connection"
            className="gap-2"
            disabled={!canNavigateTo("connection")}
          >
            <Database size={16} />
            <span className="hidden sm:inline">Database Connection</span>
            <span className="sm:hidden">Connection</span>
          </TabsTrigger>
          <TabsTrigger
            value="configuration"
            className="gap-2"
            disabled={!canNavigateTo("configuration")}
          >
            <Settings size={16} />
            <span className="hidden sm:inline">Scan Configuration</span>
            <span className="sm:hidden">Configuration</span>
          </TabsTrigger>
          <TabsTrigger
            value="results"
            className="gap-2"
            disabled={!canNavigateTo("results")}
          >
            <BarChart3 size={16} />
            <span className="hidden sm:inline">Scan Results</span>
            <span className="sm:hidden">Results</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection" className="space-y-6">
          <DatabaseConnection onConnection={handleConnection} />
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <ScanConfiguration
            connectionStatus={connectionStatus}
            connectedDb={connectedDb}
            selectedTests={selectedTests}
            onSelectedTestsChange={handleSelectedTestsChange}
            onRunScan={handleRunScan}
          />
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          <ScanResults
            sessionId={runId!}
            autoStart={shouldAutoStart}
            connectionInfo={connectionInfo}
            selectedTests={selectedTests}
            argsPayload={argsPayload}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
