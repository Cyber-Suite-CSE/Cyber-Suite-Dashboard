"use client"

import { useState, useEffect, useCallback } from "react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface ServiceStatusIndicatorProps {
    /**
     * The health check URL to probe.
     */
    url: string
    /**
     * Display name of the service (used in notifications and labels)
     */
    serviceName: string
    /**
     * Visual style of the indicator
     * - badge: small indicator, good for headers
     * - alert: full width block, good for top of page warnings
     */
    variant?: "badge" | "alert"
    /**
     * Check interval in milliseconds. Defaults to 0 (check once on mount).
     */
    checkInterval?: number
    /**
     * Callback when status changes
     */
    onStatusChange?: (isOnline: boolean) => void
}

export function ServiceStatusIndicator({
    url,
    serviceName,
    variant = "badge",
    checkInterval = 0,
    onStatusChange,
}: ServiceStatusIndicatorProps) {
    const [status, setStatus] = useState<"idle" | "checking" | "ok" | "error">("idle")
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const checkHealth = useCallback(async () => {
        setStatus("checking")
        try {
            const controller = new AbortController()
            const id = setTimeout(() => controller.abort(), 10000) // 10s timeout

            const res = await fetch(url, { signal: controller.signal })
            clearTimeout(id)

            if (res.ok) {
                setStatus("ok")
                setErrorMessage(null)
                onStatusChange?.(true)
            } else {
                throw new Error(`HTTP ${res.status}: ${res.statusText}`)
            }
        } catch (e: any) {
            console.error(`[${serviceName}] Health check failed:`, e)
            setStatus("error")
            setErrorMessage(e.message || "Connection failed")
            onStatusChange?.(false)
        }
    }, [url, serviceName, onStatusChange])

    // Initial check and interval
    useEffect(() => {
        checkHealth()

        if (checkInterval > 0) {
            const interval = setInterval(checkHealth, checkInterval)
            return () => clearInterval(interval)
        }
    }, [checkHealth, checkInterval])

    const handleRetry = (e: React.MouseEvent) => {
        e.stopPropagation()
        checkHealth()
        toast.info(`Retrying connection to ${serviceName}...`)
    }

    if (variant === "badge") {
        if (status === "idle") return null;

        if (status === "checking") {
            return (
                <Badge variant="outline" className="gap-2 py-1.5 bg-background">
                    <Loader2 size={12} className="animate-spin" />
                    <span className="hidden sm:inline">Connecting...</span>
                </Badge>
            )
        }

        if (status === "ok") {
            return (
                <Badge variant="outline" className="gap-2 py-1.5 border-green-500/30 text-green-600 bg-green-500/5 dark:bg-green-500/10">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    <span className="hidden sm:inline">Online</span>
                </Badge>
            )
        }

        return (
            <Badge
                variant="destructive"
                className="gap-2 py-1.5 cursor-pointer hover:opacity-90 shadow-sm"
                onClick={handleRetry}
                title={errorMessage || "Connection failed"}
            >
                <div className="w-2 h-2 rounded-full bg-white/80" />
                <span className="hidden sm:inline">Offline</span>
                <RefreshCw size={10} className="ml-1 opacity-70" />
            </Badge>
        )
    }

    // Alert Variant
    if (status === "idle") return null;

    if (status === "checking") {
        return (
            <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <div>
                    <h5 className="font-medium leading-none tracking-tight">Connecting to Backend...</h5>
                    <div className="text-sm text-muted-foreground mt-1">Checking {serviceName} availability...</div>
                </div>
            </div>
        )
    }

    if (status === "ok") {
        return (
            <Alert variant="default" className="border-green-500/20 bg-green-500/5">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-600">Backend Connected</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                    Successfully connected to {serviceName}
                </AlertDescription>
            </Alert>
        )
    }

    return (
        <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Backend Connection Failed</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 items-start mt-2">
                <p>
                    {errorMessage || `Cannot connect to ${serviceName}`}
                    <br />
                    <span className="text-xs opacity-75 mt-1 block">
                        Please ensure the backend service is running.
                    </span>
                </p>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-2 bg-background/50 hover:bg-background"
                    onClick={handleRetry}
                >
                    <RefreshCw size={14} />
                    Retry Connection
                </Button>
            </AlertDescription>
        </Alert>
    )
}
