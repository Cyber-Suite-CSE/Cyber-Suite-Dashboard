"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiResponse } from "./types";
import { Check, Loader2, RotateCcw } from "lucide-react";

interface SuccessResultProps {
    result: ApiResponse;
    isStartingAnalysis: boolean;
    onStartAnalysis: () => void;
    onReset: () => void;
}

export function SuccessResult({
    result,
    isStartingAnalysis,
    onStartAnalysis,
    onReset,
}: SuccessResultProps) {
    return (
        <Card className="mb-6 border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20">
            <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                    <Check className="h-6 w-6 shrink-0 text-green-600 dark:text-green-400" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-green-800 dark:text-green-200">
                            {result.message}
                        </h3>
                        <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                            {result.totalFiles} files ready for analysis
                            {result.repoName && ` from ${result.repoName}`}
                        </p>

                        {/* Framework Detection Info */}
                        {result.framework && (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                                    {result.framework.framework === "unknown"
                                        ? "Generic Project"
                                        : result.framework.framework.charAt(0).toUpperCase() +
                                        result.framework.framework.slice(1)}
                                </span>
                                <span
                                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${result.framework.confidence === "high"
                                            ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                            : result.framework.confidence === "medium"
                                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                                : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"
                                        }`}
                                >
                                    {result.framework.confidence} confidence
                                </span>
                            </div>
                        )}

                        {/* Stats */}
                        {result.stats && (
                            <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                                Processed {result.stats.totalFilesProcessed} files, included{" "}
                                {result.stats.filesIncluded}, ignored {result.stats.filesIgnored}
                            </p>
                        )}

                        <div className="mt-4 flex gap-2">
                            <Button
                                size="sm"
                                onClick={onStartAnalysis}
                                disabled={isStartingAnalysis}
                            >
                                {isStartingAnalysis ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Starting...
                                    </>
                                ) : (
                                    "Start Analysis"
                                )}
                            </Button>
                            <Button size="sm" variant="outline" onClick={onReset}>
                                <RotateCcw className="mr-2 h-4 w-4" />
                                Upload Another
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
