"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ServiceStatusIndicator } from "@/components/service-status-indicator"
import { APIClient } from "@/lib/api-client" // Keeping this if we need it later, but using direct fetch for now to match source
import { Code } from "lucide-react"

// Import migrated components
import { SuccessResult } from "./code-scanner/success-result"
import { ErrorMessage } from "./code-scanner/error-message"
import { ZipUploadTab } from "./code-scanner/zip-upload-tab"
import { GitHubRepoTab } from "./code-scanner/github-repo-tab"
import { ApiResponse } from "./code-scanner/types"

export function CodeScanner() {
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ApiResponse | null>(null)

  // Use the API URL from environment variable
  const getApiUrl = (path: string) => {
    const apiBase = process.env.NEXT_PUBLIC_CODE_SCANNER_API || "http://localhost:3000"
    // Remove trailing slash if present
    const baseUrl = apiBase.endsWith('/') ? apiBase.slice(0, -1) : apiBase
    // Add path with leading slash if missing
    const relativePath = path.startsWith('/') ? path : `/${path}`
    return `${baseUrl}${relativePath}`
  }

  const handleZipUpload = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(getApiUrl("/api/upload-zip"), {
        method: "POST",
        body: formData,
      })

      const data: ApiResponse = await response.json()

      if (!data.success) {
        setError(data.error || data.message || "Failed to process ZIP file")
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGitHubFetch = async (repoUrl: string, patToken?: string) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(getApiUrl("/api/fetch-repo"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          repoUrl,
          patToken,
        }),
      })

      const data: ApiResponse = await response.json()

      if (!data.success) {
        setError(data.error || data.message || "Failed to fetch repository")
      } else {
        setResult(data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const resetState = () => {
    setError(null)
    setResult(null)
  }

  const handleStartAnalysis = async () => {
    if (!result?.files || !result.framework) return

    setIsStartingAnalysis(true)
    setError(null)

    try {
      const response = await fetch(getApiUrl("/api/analyze"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          files: result.files,
          framework: result.framework,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        setError(data.error || "Failed to start analysis")
      } else {
        // Redirect to task page or show success
        // Since we are in the dashboard, we might want to just show a notification or redirect
        // For now, let's just log it and maybe show a success message
        console.log("Analysis started, job ID:", data.jobId)
        // You might want to implement a router push here if you have a task view
        // router.push(`/code-scanner/task/${data.jobId}`)
        alert(`Analysis started! Job ID: ${data.jobId}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start analysis")
    } finally {
      setIsStartingAnalysis(false)
    }
  }

  return (
    <div className="space-y-6">
      <ServiceStatusIndicator
        url={`${process.env.NEXT_PUBLIC_CODE_SCANNER_API}/api/health`}
        serviceName="Code Scanner"
        variant="alert"
        onStatusChange={setIsConnected}
      />

      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Code className="h-8 w-8 text-primary" />
          Code Scanner
        </h1>
        <p className="text-muted-foreground">
          AI-powered security analysis for your codebase
        </p>
      </div>

      {/* Success Result */}
      {result && result.success && (
        <SuccessResult
          result={result}
          isStartingAnalysis={isStartingAnalysis}
          onStartAnalysis={handleStartAnalysis}
          onReset={resetState}
        />
      )}

      {/* Error Message */}
      {error && (
        <ErrorMessage error={error} onDismiss={() => setError(null)} />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Upload Your Codebase</CardTitle>
          <CardDescription>
            Choose how you want to provide your code for scanning
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="github" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="github">GitHub Repository</TabsTrigger>
              <TabsTrigger value="zip">Upload ZIP File</TabsTrigger>
            </TabsList>

            <TabsContent value="zip" className="space-y-4">
              <ZipUploadTab isLoading={isLoading} onUpload={handleZipUpload} />
            </TabsContent>

            <TabsContent value="github" className="space-y-4">
              <GitHubRepoTab isLoading={isLoading} onFetch={handleGitHubFetch} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>Your code is analyzed securely and never stored permanently</p>
      </div>
    </div>
  )
}
