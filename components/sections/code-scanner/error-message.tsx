"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface ErrorMessageProps {
    error: string;
    onDismiss: () => void;
}

export function ErrorMessage({ error, onDismiss }: ErrorMessageProps) {
    return (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20">
            <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-6 w-6 shrink-0 text-red-600 dark:text-red-400" />
                    <div className="flex-1">
                        <h3 className="font-semibold text-red-800 dark:text-red-200">
                            Error
                        </h3>
                        <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                            {error}
                        </p>
                        <Button
                            size="sm"
                            variant="outline"
                            className="mt-3 border-red-200 hover:bg-red-100 hover:text-red-900 dark:border-red-900 dark:hover:bg-red-900/50 dark:hover:text-red-50"
                            onClick={onDismiss}
                        >
                            Dismiss
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
