"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, UploadCloud, FileArchive, X } from "lucide-react";

interface ZipUploadTabProps {
    isLoading: boolean;
    onUpload: (file: File) => Promise<void>;
}

function formatFileSize(bytes: number) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function ZipUploadTab({ isLoading, onUpload }: ZipUploadTabProps) {
    const [dragActive, setDragActive] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [fileError, setFileError] = useState<string | null>(null);

    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const file = e.dataTransfer.files[0];
            if (file.name.endsWith(".zip")) {
                setUploadedFile(file);
                setFileError(null);
            } else {
                setFileError("Please upload a ZIP file");
            }
        }
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.name.endsWith(".zip")) {
                setUploadedFile(file);
                setFileError(null);
            } else {
                setFileError("Please upload a ZIP file");
            }
        }
    };

    const handleSubmit = async () => {
        if (uploadedFile) {
            await onUpload(uploadedFile);
        }
    };

    return (
        <div className="space-y-4">
            <div
                className={`relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors ${dragActive
                        ? "border-primary bg-primary/5"
                        : "border-muted-foreground/25 hover:border-muted-foreground/50"
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-upload")?.click()}
            >
                <input
                    id="file-upload"
                    type="file"
                    accept=".zip"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {uploadedFile ? (
                    <div className="text-center">
                        <FileArchive className="mx-auto h-12 w-12 text-green-500" />
                        <p className="mt-2 font-medium text-foreground">
                            {uploadedFile.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                            {formatFileSize(uploadedFile.size)}
                        </p>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setUploadedFile(null);
                            }}
                            className="mt-2 flex items-center justify-center gap-1 text-sm text-destructive hover:text-destructive/80 mx-auto"
                        >
                            <X className="h-4 w-4" /> Remove file
                        </button>
                    </div>
                ) : (
                    <div className="text-center">
                        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                            <span className="font-semibold text-primary">Click to upload</span>{" "}
                            or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">ZIP files only (max 50MB)</p>
                    </div>
                )}
            </div>

            {fileError && (
                <p className="text-sm text-destructive">{fileError}</p>
            )}

            <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={!uploadedFile || isLoading}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                    </>
                ) : (
                    "Scan Codebase"
                )}
            </Button>
        </div>
    );
}
