"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Rocket,
  Monitor,
  History,
  Upload,
  Code,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { ScanResults } from "./scan-results";
import { APIClient, JobStatus } from "@/lib/api-client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface ScanConfig {
  domain: string;
  modules: string[];
  verbose: boolean;
  enumTechniques: string[];
  scanMode: string;
  customPorts: string;
  activeThreads: number;
  dnsTimeout: number;
  passiveTimeout: number;
  fingerprintTimeout: number;
  cdnBypass: boolean;
  deepCrawl: boolean;
  disableAI: boolean;
  wordlistFile?: File;
}

export function WebDomainScanner({ domain }: { domain: string }) {
  const [activeTab, setActiveTab] = useState("new-scan");
  const [wordlistFile, setWordlistFile] = useState<File | null>(null);
  const [apiClient] = useState(
    () => {
      const apiBase = process.env.NEXT_PUBLIC_WEB_SCANNER_BASE;
      if (!apiBase) console.error("NEXT_PUBLIC_WEB_SCANNER_BASE not set");
      console.log("Web Domain Scanner API Base:", apiBase);
      return new APIClient(apiBase || "");
    }
  );

  // Backend connection state
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  // Scan submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Job monitoring state
  const [activeJobs, setActiveJobs] = useState<JobStatus[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobStatus | null>(null);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobHistory, setJobHistory] = useState<JobStatus[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Frontend job tracking state for detecting completion
  const [frontendJobTracker, setFrontendJobTracker] = useState<
    Record<string, { status: string; hasBeenCompleted: boolean }>
  >({});

  // Scan configuration (matching streamlit_ui.py defaults)
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    domain: domain || "",
    modules: ["domain_enumeration", "service_discovery", "web_analysis"],
    verbose: true,
    enumTechniques: ["passive", "active", "dns", "fingerprinting"],
    scanMode: "smart",
    customPorts: "",
    activeThreads: 10,
    dnsTimeout: 5,
    passiveTimeout: 10,
    fingerprintTimeout: 30,
    cdnBypass: true,
    deepCrawl: false,
    disableAI: false,
  });

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth();
  }, []);

  // Auto-refresh jobs when monitoring
  useEffect(() => {
    if (activeTab === "monitor" && autoRefresh) {
      const interval = setInterval(() => {
        refreshJobs();
      }, 3000); // Refresh every 3 seconds
      return () => clearInterval(interval);
    }
  }, [activeTab, autoRefresh]);

  // Load jobs when switching to monitor or history tabs
  useEffect(() => {
    if (activeTab === "monitor" || activeTab === "history") {
      loadJobs();
    }
  }, [activeTab]);

  const checkBackendHealth = async () => {
    setIsCheckingConnection(true);
    const result = await apiClient.healthCheck();

    if (result.success) {
      setIsConnected(true);
      setConnectionError(null);
      toast.success("Connected to backend successfully");
    } else {
      setIsConnected(false);
      setConnectionError(result.error || "Cannot connect to backend");
      toast.error("Backend connection failed", {
        description:
          result.error ||
          "Please ensure the backend is running and accessible",
      });
    }
    setIsCheckingConnection(false);
  };

  const loadJobs = async () => {
    setIsLoadingJobs(true);
    const result = await apiClient.listJobs();

    if (result.success && result.data) {
      const jobs = result.data.jobs || [];
      setActiveJobs(
        jobs.filter(
          (job: JobStatus) =>
            job.status === "running" || job.status === "pending"
        )
      );
      setJobHistory(jobs);
    }
    setIsLoadingJobs(false);
  };

  const refreshJobs = async () => {
    const result = await apiClient.listJobs();
    console.log("Refreshing jobs:", result);
    if (result.success && result.data) {
      const jobs = result.data.jobs || [];

      // Update frontend job tracker and detect newly completed jobs
      const updatedTracker = { ...frontendJobTracker };
      const newlyCompletedJobs: JobStatus[] = [];

      jobs.forEach((job: JobStatus) => {
        const jobId = job.job_id;
        const currentStatus = job.status;

        // If we're tracking this job
        if (updatedTracker[jobId]) {
          const previousStatus = updatedTracker[jobId].status;
          const hasBeenCompleted = updatedTracker[jobId].hasBeenCompleted;

          // If job transitioned to completed/failed and we haven't processed this completion yet
          if (
            (currentStatus === "completed" || currentStatus === "failed") &&
            (previousStatus === "running" || previousStatus === "pending") &&
            !hasBeenCompleted
          ) {
            newlyCompletedJobs.push(job);
            updatedTracker[jobId] = {
              status: currentStatus,
              hasBeenCompleted: true,
            };
          } else {
            // Update status but keep hasBeenCompleted flag
            updatedTracker[jobId] = {
              ...updatedTracker[jobId],
              status: currentStatus,
            };
          }
        } else {
          // New job we haven't seen before - add to tracker
          updatedTracker[jobId] = {
            status: currentStatus,
            hasBeenCompleted:
              currentStatus === "completed" || currentStatus === "failed",
          };
        }
      });

      setFrontendJobTracker(updatedTracker);

      console.log("Frontend job tracker:", updatedTracker);
      console.log("Newly completed jobs:", newlyCompletedJobs);

      // Handle newly completed jobs
      newlyCompletedJobs.forEach((completedJob: JobStatus) => {
        setAutoRefresh(false);
        if (completedJob.status === "completed") {
          toast.success("Scan completed!", {
            description: `Job ${completedJob.job_id.slice(
              0,
              8
            )}... has finished. Navigating to results...`,
          });

          // Automatically navigate to results if the job has results
          if (completedJob.results) {
            console.log(
              "Navigating to results for completed job:",
              completedJob.job_id
            );
            // Small delay to ensure the toast is visible before navigation
            setTimeout(() => {
              setSelectedJob(completedJob);
              console.log("Selected job set to:", completedJob.job_id);
            }, 1500);
          } else {
            // toast.info("Scan completed but no results available", {
            //   description: "The job finished but didn't return any results",
            // });
          }
        } else {
          toast.error("Scan failed", {
            description: completedJob.error || "Unknown error",
          });
        }
      });

      // Filter active jobs based on current status
      const newActiveJobs = jobs.filter(
        (job: JobStatus) => job.status === "running" || job.status === "pending"
      );

      setActiveJobs(newActiveJobs);
      setJobHistory(jobs);

      // Update selected job if it's being monitored
      if (selectedJob) {
        const updatedJob = jobs.find(
          (job: JobStatus) => job.job_id === selectedJob.job_id
        );
        if (updatedJob) {
          setSelectedJob(updatedJob);
        }
      }
    }
  };

  const handleSubmitScan = async () => {
    if (!scanConfig.domain) {
      toast.error("Domain required", {
        description: "Please enter a target domain",
      });
      return;
    }

    if (scanConfig.modules.length === 0) {
      toast.error("No modules selected", {
        description: "Please select at least one module to run",
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // Prepare scan parameters (exactly matching streamlit_ui.py format)
    const scanParams = {
      domain: scanConfig.domain.trim(),
      enabled_modules: scanConfig.modules,
      verbose: scanConfig.verbose,
      scan_mode: scanConfig.scanMode,
      bypass_cdn: scanConfig.cdnBypass,
      deep_crawl: scanConfig.deepCrawl,
      active_threads: scanConfig.activeThreads,
      passive_timeout: scanConfig.passiveTimeout,
      dns_timeout: scanConfig.dnsTimeout,
      fingerprint_timeout: scanConfig.fingerprintTimeout,
      no_ai: scanConfig.disableAI,
      domain_enum_modules: scanConfig.enumTechniques,
      ...(scanConfig.customPorts && { ports: scanConfig.customPorts }),
    };

    const result = await apiClient.submitScan(scanParams);

    console.log("Scan submission result:", result);

    if (result.success && result.job_id) {
      console.log("Scan submitted successfully, job_id:", result.job_id);

      // Add job to our frontend tracker as "pending"
      setFrontendJobTracker((prev) => ({
        ...prev,
        [result.job_id as string]: {
          status: "pending",
          hasBeenCompleted: false,
        },
      }));

      toast.success("Scan submitted!", {
        description: `Job ID: ${result.job_id.slice(0, 8)}...`,
      });

      // Wait for job to be persisted and try to fetch it
      let retries = 0;
      const maxRetries = 5;
      let jobFound = false;

      while (retries < maxRetries && !jobFound) {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const statusCheck = await apiClient.getJobStatus(result.job_id);
        if (statusCheck.success) {
          jobFound = true;
          console.log("Job found after", retries + 1, "retries");
        } else {
          console.log(
            "Job not found yet, retry",
            retries + 1,
            "of",
            maxRetries
          );
          retries++;
        }
      }

      if (!jobFound) {
        toast.warning("Job submitted but not yet visible", {
          description: "Refresh the monitor tab in a few seconds",
        });
      }

      // Switch to monitor tab and start auto-refresh
      setActiveTab("monitor");
      setAutoRefresh(true);
      await loadJobs();
    } else {
      console.error("Scan submission failed:", result.error);
      setSubmitError(result.error || "Failed to submit scan");
      toast.error("Scan submission failed", {
        description: result.error || "Unknown error",
      });
    }

    setIsSubmitting(false);
  };

  const handleSelectJob = async (jobId: string) => {
    const result = await apiClient.getJobStatus(jobId);
    if (result.success && result.data) {
      setSelectedJob(result.data as JobStatus);
      if (
        result.data.status === "running" ||
        result.data.status === "pending"
      ) {
        setAutoRefresh(true);
      }
    } else {
      toast.error("Failed to get job status", {
        description: result.error || "Job not found",
      });
      console.error("Job status error:", result.error, "Job ID:", jobId);
    }
  };

  const handleViewResults = (job: JobStatus, event?: React.MouseEvent) => {
    // Prevent event bubbling to parent onClick handler
    if (event) {
      event.stopPropagation();
    }

    // if (job.results) {
    //   // Show results in ScanResults component
    //   setSelectedJob(job);
    // } else {
    //   toast.error("No results available", {
    //     description: "This job has no results to display",
    //   });
    // }
  };

  const handleCancelJob = async (jobId: string, event?: React.MouseEvent) => {
    // Prevent event bubbling to parent onClick handler
    if (event) {
      event.stopPropagation();
    }

    // Frontend trick - just remove from active jobs list
    setActiveJobs((prev) => prev.filter((job) => job.job_id !== jobId));

    // Update job history to mark as cancelled
    setJobHistory((prev) =>
      prev.map((job) =>
        job.job_id === jobId
          ? { ...job, status: "cancelled" as any, message: "Cancelled by user" }
          : job
      )
    );

    // If this was the selected job, clear it
    if (selectedJob && selectedJob.job_id === jobId) {
      setSelectedJob(null);
    }

    toast.success("Job cancelled", {
      description: `Job ${jobId.slice(0, 8)}... has been cancelled`,
    });
  };

  // Show results if a completed job is selected
  if (
    selectedJob &&
    selectedJob.status === "completed" &&
    selectedJob.results
  ) {
    console.log("Rendering ScanResults for job:", selectedJob.job_id);
    return (
      <ScanResults
        data={selectedJob.results}
        jobInfo={selectedJob}
        onBack={() => setSelectedJob(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Backend Connection Status */}
      {isCheckingConnection ? (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertTitle>Connecting to Backend...</AlertTitle>
          <AlertDescription>
            Checking backend health...
          </AlertDescription>
        </Alert>
      ) : !isConnected ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Backend Connection Failed</AlertTitle>
          <AlertDescription>
            {connectionError || "Cannot connect to backend"}
            <br />
            <span className="text-xs mt-2 block">
              Ensure the backend is running
            </span>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={checkBackendHealth}
            >
              Retry Connection
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>Backend Connected</AlertTitle>
          <AlertDescription>
            Successfully connected to backend
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        `
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="new-scan" className="gap-2">
            <Rocket size={16} />
            New Scan
          </TabsTrigger>
          <TabsTrigger value="monitor" className="gap-2">
            <Monitor size={16} />
            Monitor Jobs
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History size={16} />
            Job History
          </TabsTrigger>
        </TabsList>
        {/* New Scan Tab */}
        <TabsContent value="new-scan" className="space-y-6">
          {/* Target Domain Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-accent">🎯</span>
                Target Domain
              </CardTitle>
              <CardDescription>
                Enter the domain you want to scan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="text"
                placeholder="example.com"
                value={scanConfig.domain}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setScanConfig((prev: ScanConfig) => ({
                    ...prev,
                    domain: e.target.value,
                  }));
                }}
                className="w-full px-4 py-3 rounded-lg border border-border bg-input text-foreground text-lg font-mono"
              />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-accent">⚙️</span>
                  Basic Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Select Modules to Run
                  </label>
                  <div className="space-y-2">
                    {[
                      "domain_enumeration",
                      "service_discovery",
                      "web_analysis",
                    ].map((module) => (
                      <div key={module} className="flex items-center gap-2">
                        <Checkbox
                          checked={scanConfig.modules.includes(module)}
                          onCheckedChange={(checked: boolean) => {
                            setScanConfig((prev: ScanConfig) => ({
                              ...prev,
                              modules: checked
                                ? [...prev.modules, module]
                                : prev.modules.filter(
                                  (m: string) => m !== module
                                ),
                            }));
                          }}
                          id={module}
                        />
                        <label
                          htmlFor={module}
                          className="text-sm cursor-pointer"
                        >
                          {module.replace("_", " ").toUpperCase()}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* <div>
                  <label className="text-sm font-medium mb-2 block">
                    Verbose Output
                  </label>
                  <Checkbox
                    checked={scanConfig.verbose}
                    onCheckedChange={(checked: boolean) => {
                      setScanConfig((prev: ScanConfig) => ({
                        ...prev,
                        verbose: !!checked,
                      }));
                    }}
                  />
                </div> */}
              </CardContent>
            </Card>

            {/* Domain Enumeration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-accent">🔍</span>
                  Domain Enumeration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Enumeration Techniques
                  </label>
                  <div className="space-y-2">
                    {["passive", "active", "dns", "fingerprinting"].map(
                      (tech) => (
                        <div key={tech} className="flex items-center gap-2">
                          <Checkbox
                            checked={scanConfig.enumTechniques.includes(tech)}
                            onCheckedChange={(checked: boolean) => {
                              setScanConfig((prev: ScanConfig) => ({
                                ...prev,
                                enumTechniques: checked
                                  ? [...prev.enumTechniques, tech]
                                  : prev.enumTechniques.filter(
                                    (t: string) => t !== tech
                                  ),
                              }));
                            }}
                            id={tech}
                          />
                          <label
                            htmlFor={tech}
                            className="text-sm cursor-pointer capitalize"
                          >
                            {tech}
                          </label>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Discovery */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-accent">🎯</span>
                Service Discovery
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Port Scan Mode
                  </label>
                  <Select
                    value={scanConfig.scanMode}
                    onValueChange={(value: string) => {
                      setScanConfig((prev: ScanConfig) => ({
                        ...prev,
                        scanMode: value,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="quick">Quick (Top 100)</SelectItem>
                      <SelectItem value="smart">Smart (Top 1000)</SelectItem>
                      <SelectItem value="deep">Deep (All 65535)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Custom Ports (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="80,443,8080"
                    value={scanConfig.customPorts}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      setScanConfig((prev: ScanConfig) => ({
                        ...prev,
                        customPorts: e.target.value,
                      }));
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-input text-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          {/* <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-accent">⚡</span>
                Advanced Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Active Threads: {scanConfig.activeThreads}
                  </label>
                  <Slider
                    value={[scanConfig.activeThreads]}
                    onValueChange={(value: number[]) => {
                      setScanConfig((prev) => ({
                        ...prev,
                        activeThreads: value[0],
                      }));
                    }}
                    min={1}
                    max={50}
                    step={1}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    DNS Timeout: {scanConfig.dnsTimeout}s
                  </label>
                  <Slider
                    value={[scanConfig.dnsTimeout]}
                    onValueChange={(value: number[]) => {
                      setScanConfig((prev) => ({
                        ...prev,
                        dnsTimeout: value[0],
                      }));
                    }}
                    min={1}
                    max={30}
                    step={1}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Passive Timeout: {scanConfig.passiveTimeout}s
                  </label>
                  <Slider
                    value={[scanConfig.passiveTimeout]}
                    onValueChange={(value: number[]) => {
                      setScanConfig((prev) => ({
                        ...prev,
                        passiveTimeout: value[0],
                      }));
                    }}
                    min={5}
                    max={60}
                    step={1}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-3 block">
                    Fingerprint Timeout: {scanConfig.fingerprintTimeout}s
                  </label>
                  <Slider
                    value={[scanConfig.fingerprintTimeout]}
                    onValueChange={(value: number[]) => {
                      setScanConfig((prev) => ({
                        ...prev,
                        fingerprintTimeout: value[0],
                      }));
                    }}
                    min={10}
                    max={120}
                    step={1}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={scanConfig.cdnBypass}
                    onCheckedChange={(checked: boolean) => {
                      setScanConfig((prev) => ({
                        ...prev,
                        cdnBypass: !!checked,
                      }));
                    }}
                    id="cdn-bypass"
                  />
                  <label
                    htmlFor="cdn-bypass"
                    className="text-sm cursor-pointer"
                  >
                    CDN Bypass
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={scanConfig.deepCrawl}
                    onCheckedChange={(checked: boolean) => {
                      setScanConfig((prev) => ({
                        ...prev,
                        deepCrawl: !!checked,
                      }));
                    }}
                    id="deep-crawl"
                  />
                  <label
                    htmlFor="deep-crawl"
                    className="text-sm cursor-pointer"
                  >
                    Deep Crawl
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={scanConfig.disableAI}
                    onCheckedChange={(checked: boolean) => {
                      setScanConfig((prev) => ({
                        ...prev,
                        disableAI: !!checked,
                      }));
                    }}
                    id="disable-ai"
                  />
                  <label
                    htmlFor="disable-ai"
                    className="text-sm cursor-pointer"
                  >
                    Disable AI
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-accent">📄</span>
                Custom Wordlist (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-accent transition-colors cursor-pointer">
                <input
                  type="file"
                  accept=".txt"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setWordlistFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                  id="wordlist-upload"
                />
                <label
                  htmlFor="wordlist-upload"
                  className="cursor-pointer block"
                >
                  <Upload size={24} className="mx-auto mb-2 text-accent" />
                  <p className="text-sm font-medium">
                    {wordlistFile
                      ? wordlistFile.name
                      : "Drag and drop or click to upload wordlist"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Limit 200MB per file • TXT format
                  </p>
                </label>
              </div>
            </CardContent>
          </Card> */}

          {/* Submit Button */}
          <Card>
            <CardContent className="pt-6">
              {submitError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Submission Failed</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleSubmitScan}
                disabled={!isConnected || isSubmitting || !scanConfig.domain}
                className="w-full gap-2"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    Submitting Scan...
                  </>
                ) : (
                  <>
                    <Rocket size={20} />
                    Start Scan
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Monitor Jobs Tab */}
        <TabsContent value="monitor" className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  loadJobs();
                  toast.info("Jobs refreshed");
                }}
                variant="outline"
                size="sm"
                disabled={isLoadingJobs}
                className="gap-2"
              >
                {isLoadingJobs ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  "🔄"
                )}
                Refresh
              </Button>

              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                className="gap-2"
              >
                {autoRefresh ? "⏸️ Stop Auto-Refresh" : "▶️ Auto-Refresh"}
              </Button>
            </div>
          </div>

          {isLoadingJobs ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-muted-foreground">Loading jobs...</p>
              </CardContent>
            </Card>
          ) : activeJobs.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Active Jobs</CardTitle>
                <CardDescription>
                  Monitor running scans in real-time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <p>No active jobs. Start a new scan to begin monitoring.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <Card
                  key={job.job_id}
                  className="cursor-pointer hover:border-accent transition-colors"
                  onClick={() => handleSelectJob(job.job_id)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{job.domain}</CardTitle>
                        <CardDescription>
                          Job ID: {job.job_id.slice(0, 16)}...
                        </CardDescription>
                      </div>
                      <Badge
                        variant={
                          job.status === "running" ? "default" : "secondary"
                        }
                      >
                        {job.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {job.progress && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress</span>
                          <span className="font-semibold">
                            {job.progress.percentage}%
                          </span>
                        </div>
                        <Progress value={job.progress.percentage} />
                        <p className="text-xs text-muted-foreground">
                          Completed {job.progress.completed_modules}/
                          {job.progress.total_modules} modules
                        </p>
                      </div>
                    )}

                    {job.current_module && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Current Module:{" "}
                        </span>
                        <span className="font-semibold">
                          {job.current_module.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    )}

                    {job.running_time_seconds && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">
                          Running Time:{" "}
                        </span>
                        <span className="font-semibold">
                          {job.running_time_seconds.toFixed(1)}s
                        </span>
                      </div>
                    )}

                    {job.message && (
                      <p className="text-sm text-muted-foreground">
                        {job.message}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => handleCancelJob(job.job_id, e)}
                        className="text-xs"
                      >
                        Cancel Job
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Selected Job Details */}
          {selectedJob &&
            selectedJob.status === "running" &&
            selectedJob.verbose_logs && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted rounded-lg p-4 font-mono text-xs space-y-1 max-h-96 overflow-y-auto">
                    {selectedJob.verbose_logs.slice(-20).map((log, idx) => (
                      <div key={idx} className="text-muted-foreground">
                        {log}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
        </TabsContent>
        {/* Job History Tab */}
        <TabsContent value="history" className="space-y-6">
          {isLoadingJobs ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-muted-foreground">Loading history...</p>
              </CardContent>
            </Card>
          ) : jobHistory.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Scan History</CardTitle>
                <CardDescription>
                  View past scan results and statistics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <p>No scan history available yet.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Scan History</CardTitle>
                <CardDescription>
                  {jobHistory.length} total scans
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {jobHistory.map((job) => (
                    <div
                      key={job.job_id}
                      className="flex justify-between items-center p-3 rounded-lg border border-border hover:border-accent transition-colors cursor-pointer"
                      onClick={() =>
                        job.status === "completed" &&
                        handleSelectJob(job.job_id)
                      }
                    >
                      <div>
                        <p className="font-semibold">{job.domain}</p>
                        <p className="text-xs text-muted-foreground">
                          {job.created_at &&
                            new Date(
                              job.created_at + 5.3 * 60 * 1000
                            ).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {job.execution_time_seconds && (
                          <span className="text-sm text-muted-foreground">
                            {job.execution_time_seconds.toFixed(1)}s
                          </span>
                        )}
                        <Badge
                          variant={
                            job.status === "completed"
                              ? "default"
                              : job.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {job.status.toUpperCase()}
                        </Badge>
                        {job.status === "completed" && job.results && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => handleViewResults(job, e)}
                          >
                            View Results
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
