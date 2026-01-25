"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Code, Loader2, Play } from "lucide-react"
import { APIClient } from "@/lib/api-client"

export function CodeScanner() {
  const [repoUrl, setRepoUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [codeData, setCodeData] = useState<{ issues: number; critical: number; quality: string }>({
    issues: 0,
    critical: 0,
    quality: "N/A",
  })

  // Start scan handler
  const startScan = async () => {
    if (!repoUrl) return

    setIsLoading(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_CODE_SCANNER_API!
      const client = new APIClient(apiUrl)
      // Adjust payload key if backend expects 'domain' or 'repo_url'.
      // Assuming current backend expects 'domain' as generic target key based on previous code.
      const response = await client.submitScan({ domain: repoUrl })

      if (response.success && response.data) {
        setCodeData({
          issues: (response.data as any).total_issues || 0,
          critical: (response.data as any).critical_count || 0,
          quality: (response.data as any).quality_score || "N/A",
        })
      }
    } catch (error) {
      console.error("Error fetching code data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Code Scanner</h1>
        <p className="text-muted-foreground">Analyze source code for vulnerabilities</p>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 rounded-lg border border-border">
        <Input
          placeholder="Enter GitHub Repository URL (e.g. https://github.com/user/repo)"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          className="flex-1"
        />
        <Button onClick={startScan} disabled={isLoading || !repoUrl}>
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
          Start Scan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Issues Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{codeData.issues}</div>
              {isLoading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Code vulnerabilities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-accent">{codeData.critical}</div>
              {isLoading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Severity issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Code Quality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-green-500">{codeData.quality}</div>
              {isLoading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Score</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code size={20} className="text-accent" />
            Code Analysis Results
          </CardTitle>
          <CardDescription>SAST and dependency scanning results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {repoUrl ? <p>Results for {repoUrl} will appear here.</p> : <p>Run a scan to analyze source code</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
