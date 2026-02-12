"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";


import { Button } from "@/components/ui/button";
import {
    LogEntry,
    ProgressData,
    AnalysisResult,
    JobStatus,
} from "@/components/sections/code-scanner/task/types";
import { StatusCard } from "@/components/sections/code-scanner/task/StatusCard";
import { LogsCard } from "@/components/sections/code-scanner/task/LogsCard";
import { ResultsCard } from "@/components/sections/code-scanner/task/ResultsCard";
import { SecurityReportsSection } from "@/components/sections/code-scanner/task/SecurityReportsSection";
import { CancelledCard } from "@/components/sections/code-scanner/task/CancelledCard";
import { ErrorCard } from "@/components/sections/code-scanner/task/ErrorCard";

export default function AnalysisTaskPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [status, setStatus] = useState<JobStatus>("pending");
    const [progress, setProgress] = useState<ProgressData>({
        stage: "Initializing...",
        current: 0,
        total: 100,
    });
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);
    const [isCancelling, setIsCancelling] = useState(false);

    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (!id) return;

        let isMounted = true;
        let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

        const connectStream = async () => {
            try {
                const baseUrl = process.env.NEXT_PUBLIC_CODE_SCANNER_API;
                const response = await fetch(`${baseUrl}/api/jobs/${id}/events`, {
                    headers: {
                        'Accept': 'text/event-stream',
                    }
                });

                if (!response.ok) {
                    throw new Error(`SSE Error: ${response.status}`);
                }

                if (!response.body) return;

                reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                setConnected(true);
                console.log("Stream connected");

                while (isMounted) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    buffer += chunk;

                    // Process lines in buffer
                    const lines = buffer.split('\n\n');
                    buffer = lines.pop() || ''; // Keep the last incomplete chunk

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith(':')) continue; // Skip pings and comments

                        if (trimmed.startsWith('data: ')) {
                            const dataStr = trimmed.slice(6);
                            try {
                                const payload = JSON.parse(dataStr);
                                console.log("Stream Message:", payload);

                                switch (payload.type) {
                                    case "status":
                                        setStatus(payload.data.status);
                                        if (payload.data.status === 'failed' && payload.data.error) {
                                            setError(payload.data.error);
                                        }
                                        break;
                                    case "progress":
                                        setProgress(payload.data);
                                        break;
                                    case "log":
                                        setLogs((prev) => [...prev, payload.data]);
                                        break;
                                    case "result":
                                        setResult(payload.data);
                                        break;
                                    case "error":
                                        setError(payload.data.message);
                                        setStatus("failed");
                                        break;
                                }
                            } catch (e) {
                                console.error("Failed to parse stream data:", e);
                            }
                        }
                    }
                }

            } catch (err) {
                console.error("Stream connection failed:", err);
                setConnected(false);
            }
        };

        connectStream();

        return () => {
            isMounted = false;
        };
    }, [id]);



    const handleCancel = async () => {
        if (!confirm("Are you sure you want to cancel the analysis?")) return;

        setIsCancelling(true);
        try {
            const response = await fetch(
                `/api/gateway/code-scanner/api/jobs/${id}`,
                {
                    method: "DELETE",
                }
            );

            if (!response.ok) {
                throw new Error("Failed to cancel job");
            }

            toast.success("Analysis cancelled successfully");
        } catch (err) {
            console.error("Error cancelling job:", err);
            toast.error("Failed to cancel analysis");
            setIsCancelling(false);
        }
    };

    if (!id) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-5xl py-8 space-y-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.back()}>
                    ← Back
                </Button>
                <h1 className="text-2xl font-bold">Analysis Task: {id}</h1>
            </div>

            <div className="grid gap-6">
                {/* Status Card */}
                <StatusCard
                    status={status}
                    progress={progress}
                    connected={connected}
                    isCancelling={isCancelling}
                    onCancel={handleCancel}
                />

                {/* Error State */}
                {error && <ErrorCard error={error} />}

                {/* Cancelled State */}
                {status === "cancelled" && <CancelledCard />}

                {/* Results */}
                {status === "completed" && result && (
                    <>
                        <ResultsCard result={result} />
                        <SecurityReportsSection result={result} />
                    </>
                )}

                {/* Live Logs */}
                <LogsCard logs={logs} isCompleted={status === "completed" || status === "failed" || status === "cancelled"} />
            </div>
        </div>
    );
}
