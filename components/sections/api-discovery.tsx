"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Loader2, Shield, Lock, AlertCircle, CheckCircle2 } from "lucide-react"
import { APIClient } from "@/lib/api-client"

interface APIDiscoveryProps {
  domain: string
}

export function APIDiscovery({ domain }: APIDiscoveryProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [apiData, setApiData] = useState<{ found: number; unauthenticated: number; sensitiveData: number }>({
    found: 0,
    unauthenticated: 0,
    sensitiveData: 0,
  })

  useEffect(() => {
    if (domain) {
      const fetchAPIData = async () => {
        setIsLoading(true)
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_DISCOVERY_API || "http://localhost:5003"
          const client = new APIClient(apiUrl)
          const response = await client.submitScan({ domain })

          if (response.success && response.data) {
            setApiData({
              found: (response.data as any).apis_found || 0,
              unauthenticated: (response.data as any).unauthenticated_count || 0,
              sensitiveData: (response.data as any).sensitive_data_count || 0,
            })
          }
        } catch (error) {
          console.error("Error fetching API data:", error)
        } finally {
          setIsLoading(false)
        }
      }

      fetchAPIData()
    }
  }, [domain])

  const capabilities = [
    {
      icon: Shield,
      title: "API Endpoint Discovery",
      description:
        "Crawl and enumerate public and internal API endpoints, map routes, methods, parameters, and authentication requirements.",
    },
    {
      icon: Lock,
      title: "Access Control Testing",
      description:
        "Verify role- and permission-based access controls, test for horizontal and vertical privilege escalation.",
    },
    {
      icon: AlertCircle,
      title: "Payload Vulnerability Testing",
      description:
        "Test input handling for SQL injection, NoSQL injection, command injection, XXE, deserialization flaws, SSRF, and unsafe file uploads.",
    },
    {
      icon: CheckCircle2,
      title: "Authentication & Session Testing",
      description:
        "Assess token management, session fixation, weak credential handling, OAuth/OIDC flows, and rate-limiting bypasses.",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Title and description - unchanged */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">API Access and Payload Security Checker</h1>
        <p className="text-muted-foreground">Discover and analyze API endpoints</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {capabilities.map((capability, index) => {
          const Icon = capability.icon
          return (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Icon size={20} className="text-accent" />
                  <CardTitle className="text-base">{capability.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{capability.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Dashboard metrics - kept in the middle */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">APIs Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold">{apiData.found}</div>
              {isLoading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Endpoints discovered</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unauthenticated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-accent">{apiData.unauthenticated}</div>
              {isLoading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Endpoints</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Sensitive Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-3xl font-bold text-orange-500">{apiData.sensitiveData}</div>
              {isLoading && <Loader2 size={16} className="animate-spin text-muted-foreground" />}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Exposures found</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap size={20} className="text-accent" />
            API Endpoints
          </CardTitle>
          <CardDescription>REST, GraphQL, and other API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            {domain ? <p>Scanning {domain} for API endpoints...</p> : <p>Run a scan to discover API endpoints</p>}
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/20 bg-accent/5">
        <CardHeader>
          <CardTitle className="text-lg">Why API Security Matters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            APIs often expose the most sensitive business logic and data. Misconfigurations or incomplete access
            controls allow attackers to:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 ml-4">
            <li>• Retrieve, modify, or delete sensitive data</li>
            <li>• Impersonate users and escalate privileges</li>
            <li>• Pivot further into internal systems</li>
            <li>• Exploit unsafe payload handling and authentication flaws</li>
          </ul>
          <p className="text-sm text-muted-foreground mt-4">
            Our approach focuses on real-world exploitability and practical fixes to reduce risk quickly with automated
            scanning and manual validation.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
