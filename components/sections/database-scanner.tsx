"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Database, Settings, BarChart3 } from "lucide-react";
import { DatabaseConnection } from "./database-scanner/database-connection";
import { ScanConfiguration } from "./database-scanner/scan-configuration";
import { ScanResults } from "./database-scanner/scan-results";
import { ServiceStatusIndicator } from "@/components/service-status-indicator";

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



  return (
    <div className="space-y-6">
      <ServiceStatusIndicator
        url={
          process.env.NEXT_PUBLIC_DATABASE_SCANNER_URL?.endsWith("/")
            ? process.env.NEXT_PUBLIC_DATABASE_SCANNER_URL
            : `${process.env.NEXT_PUBLIC_DATABASE_SCANNER_URL}/`
        }
        serviceName="Database Scanner"
        variant="alert"
        checkInterval={30000}
        onStatusChange={(online) => console.log("Database Scanner online:", online)}
      />

      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          Database Scanner
        </h1>
        <p className="text-muted-foreground">
          Discover and analyze database services with comprehensive security testing
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
