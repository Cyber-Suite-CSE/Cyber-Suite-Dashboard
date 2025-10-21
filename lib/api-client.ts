export interface ScanResponse {
  success: boolean
  job_id?: string
  data?: unknown
  error?: string
}

export class APIClient {
  private baseUrl: string

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }

  async submitScan(params: Record<string, unknown>): Promise<ScanResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      })

      if (response.ok) {
        const data = await response.json()
        return { success: true, job_id: data.job_id, data }
      } else {
        const error = await response.json()
        return { success: false, error: error.error || "Failed to submit scan" }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async getJobStatus(jobId: string): Promise<ScanResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/status/${jobId}`)

      if (response.ok) {
        const data = await response.json()
        return { success: true, data }
      } else {
        return { success: false, error: "Job not found" }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async listJobs(): Promise<ScanResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/jobs`)

      if (response.ok) {
        const data = await response.json()
        return { success: true, data }
      } else {
        return { success: false, error: "Failed to list jobs" }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }

  async healthCheck(): Promise<ScanResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`)

      if (response.ok) {
        const data = await response.json()
        return { success: true, data }
      } else {
        return { success: false, error: "Server unhealthy" }
      }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  }
}
