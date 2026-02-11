"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Github } from "lucide-react";

interface GitHubRepoTabProps {
    isLoading: boolean;
    onFetch: (repoUrl: string, patToken?: string) => Promise<void>;
}

export function GitHubRepoTab({ isLoading, onFetch }: GitHubRepoTabProps) {
    const [repoUrl, setRepoUrl] = useState("");
    const [patToken, setPatToken] = useState("");

    const handleSubmit = async () => {
        if (repoUrl) {
            await onFetch(repoUrl, patToken || undefined);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="repo-url">Repository URL</Label>
                <div className="relative">
                    <Github className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        id="repo-url"
                        type="url"
                        placeholder="https://github.com/username/repository"
                        value={repoUrl}
                        onChange={(e) => setRepoUrl(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    Enter the full URL of your GitHub repository
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="pat-token">
                    Personal Access Token (PAT)
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                        — optional for public repos
                    </span>
                </Label>
                <Input
                    id="pat-token"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={patToken}
                    onChange={(e) => setPatToken(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                    Required for private repositories. Generate a token with repo access at{" "}
                    <a
                        href="https://github.com/settings/tokens"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                    >
                        GitHub Settings
                    </a>
                </p>
            </div>

            <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!repoUrl || isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching...
                    </>
                ) : (
                    "Fetch & Scan Repository"
                )}
            </Button>
        </div>
    );
}
