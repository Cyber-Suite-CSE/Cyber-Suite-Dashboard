// API Configuration
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Type Definitions
export interface ScanParams {
  domain: string;
  enabled_modules: string[];
  verbose: boolean;
  scan_mode: string;
  bypass_cdn: boolean;
  deep_crawl: boolean;
  active_threads: number;
  passive_timeout?: number;
  dns_timeout?: number;
  fingerprint_timeout?: number;
  no_ai: boolean;
  domain_enum_modules: string[];
  ports?: string;
}

export interface ScanResponse {
  success: boolean;
  job_id?: string;
  data?: any;
  error?: string;
}

export interface JobStatus {
  job_id: string;
  domain: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: {
    percentage: number;
    completed_modules: number;
    total_modules: number;
  };
  current_module?: string;
  running_time_seconds?: number;
  execution_time_seconds?: number;
  verbose_logs?: string[];
  results?: any;
  error?: string;
  message?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
}

export class APIClient {
  private baseUrl: string;
  private timeout: number;

  constructor(baseUrl: string, timeout: number = DEFAULT_TIMEOUT) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }

  /**
   * Generic fetch wrapper with timeout and error handling
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }
      throw error;
    }
  }

  async submitScan(params: Record<string, unknown>): Promise<ScanResponse> {
    try {
      console.log("Submitting scan with params:", params);

      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      console.log("Scan submission response status:", response.status);

      if (response.ok) {
        const result = await response.json();
        console.log("Scan submission response body:", result);

        // Handle both wrapped and direct response formats
        const data = result.data || result;
        return { success: true, job_id: data.job_id, data };
      } else {
        const error = await response.json().catch(() => ({}));
        console.error("Scan submission failed:", response.status, error);
        return {
          success: false,
          error: error.error || "Failed to submit scan",
        };
      }
    } catch (error) {
      console.error("Scan submission exception:", error);
      return { success: false, error: String(error) };
    }
  }

  async getJobStatus(jobId: string): Promise<ScanResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/status/${jobId}`
      );

      if (response.ok) {
        const result = await response.json();
        // Handle both wrapped and direct response formats
        const data = result.data || result;
        return { success: true, data };
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `HTTP ${response.status}: Job not found`;
        console.error(
          `Failed to get job status for ${jobId}:`,
          response.status,
          errorMessage
        );
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error(`Exception getting job status for ${jobId}:`, error);
      return { success: false, error: String(error) };
    }
  }

  async listJobs(): Promise<ScanResponse> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/jobs`);

      if (response.ok) {
        const result = await response.json();
        // Handle both wrapped and direct response formats
        let data = result.data || result;

        // Ensure proper format
        if (!data.jobs) {
          data = {
            jobs: result.jobs || [],
            total_jobs: result.total_jobs || 0,
          };
        }

        return { success: true, data };
      } else {
        return { success: false, error: "Failed to list jobs" };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  async healthCheck(): Promise<ScanResponse> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}/api/health`
      );

      if (response.ok) {
        const result = await response.json();
        // Handle both wrapped and direct response formats
        const data = result.data || result;
        return { success: true, data };
      } else {
        return { success: false, error: "Server unhealthy" };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }
}
