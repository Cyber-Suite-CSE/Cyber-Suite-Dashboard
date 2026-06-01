"use client"

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export type ServiceKey = "webScanner" | "misconfigChecker" | "codeScanner" | "apiTester" | "databaseScanner";

export interface ServiceStatus {
  status: "idle" | "checking" | "ok" | "error";
  errorMessage: string | null;
}

export type ServiceHealthState = Record<ServiceKey, ServiceStatus>;

interface SuiteHealthContextType {
  serviceHealth: ServiceHealthState;
  checkHealth: (key: ServiceKey) => Promise<void>;
  checkAllHealth: () => Promise<void>;
}

const SuiteHealthContext = createContext<SuiteHealthContextType | undefined>(undefined);

const initialStatus: ServiceStatus = { status: "idle", errorMessage: null };

const initialHealthState: ServiceHealthState = {
  webScanner: initialStatus,
  misconfigChecker: initialStatus,
  codeScanner: initialStatus,
  apiTester: initialStatus,
  databaseScanner: initialStatus,
};

const getServiceUrl = (key: ServiceKey): string => {
  switch (key) {
    case "webScanner":
      return `${process.env.NEXT_PUBLIC_WEB_SCANNER_BASE || "/api/gateway/web-scanner"}/api/health`;
    case "misconfigChecker":
      return `${process.env.NEXT_PUBLIC_MISCONFIG_CHECKER_API || "/api/gateway/misconfig-checker"}/api/health`;
    case "codeScanner":
      const codeBase = process.env.NEXT_PUBLIC_CODE_SCANNER_API || "/api/gateway/code-scanner";
      const cleanedCodeBase = codeBase.endsWith("/") ? codeBase.slice(0, -1) : codeBase;
      return `${cleanedCodeBase}/api/health`;
    case "apiTester":
      return `${process.env.NEXT_PUBLIC_API_TESTER_BASE || "/api/gateway/api-tester"}/health`;
    case "databaseScanner":
      const dbBase = process.env.NEXT_PUBLIC_DATABASE_SCANNER_URL || "/api/gateway/database-scanner";
      return dbBase.endsWith("/") ? dbBase : `${dbBase}/`;
  }
};

export function SuiteHealthProvider({ children }: { children: React.ReactNode }) {
  const [serviceHealth, setServiceHealth] = useState<ServiceHealthState>(initialHealthState);

  const checkHealth = useCallback(async (key: ServiceKey) => {
    setServiceHealth((prev) => ({
      ...prev,
      [key]: { ...prev[key], status: "checking" },
    }));

    try {
      const url = getServiceUrl(key);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        setServiceHealth((prev) => ({
          ...prev,
          [key]: { status: "ok", errorMessage: null },
        }));
      } else {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (e: any) {
      setServiceHealth((prev) => ({
        ...prev,
        [key]: { status: "error", errorMessage: e.message || "Connection failed" },
      }));
    }
  }, []);

  const checkAllHealth = useCallback(async () => {
    const keys: ServiceKey[] = ["webScanner", "misconfigChecker", "codeScanner", "apiTester", "databaseScanner"];
    await Promise.all(keys.map((key) => checkHealth(key)));
  }, [checkHealth]);

  // Initial fetch and 30-second interval polling
  useEffect(() => {
    checkAllHealth();
    const interval = setInterval(checkAllHealth, 30000);
    return () => clearInterval(interval);
  }, [checkAllHealth]);

  return (
    <SuiteHealthContext.Provider value={{ serviceHealth, checkHealth, checkAllHealth }}>
      {children}
    </SuiteHealthContext.Provider>
  );
}

export function useSuiteHealth() {
  const context = useContext(SuiteHealthContext);
  if (!context) {
    throw new Error("useSuiteHealth must be used within a SuiteHealthProvider");
  }
  return context;
}
