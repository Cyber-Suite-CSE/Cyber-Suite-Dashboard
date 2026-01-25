"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CheckCircle2, XCircle } from "lucide-react"

export function BackendStatus() {
    const [isOnline, setIsOnline] = useState<boolean | null>(null)

    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch("/api/gateway/misconfig-checker/api/health")
                if (res.ok) {
                    setIsOnline(true)
                } else {
                    setIsOnline(false)
                }
            } catch (error) {
                setIsOnline(false)
            }
        }

        // Check immediately
        checkStatus()

        // Poll every 30 seconds
        const interval = setInterval(checkStatus, 30000)
        return () => clearInterval(interval)
    }, [])

    if (isOnline === null) return null // Initial loading state

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border cursor-help transition-colors hover:bg-muted">
                        <span className="text-xs font-medium text-muted-foreground">System Status</span>
                        {isOnline ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500 animate-pulse" />
                        ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{isOnline ? "Deployment Misconfig Checker is Online" : "Deployment Misconfig Checker is Offline"}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
