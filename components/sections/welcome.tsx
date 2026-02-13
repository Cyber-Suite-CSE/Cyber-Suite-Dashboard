"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Shield,
    Globe,
    Database,
    AlertTriangle,
    Code,
    ArrowRight,
    Bot,
    Activity,
    Lock,
    Search
} from "lucide-react"

interface WelcomeProps {
    onNavigate?: (nav: string) => void
}

export function Welcome({ onNavigate }: WelcomeProps) {
    return (
        <div className="space-y-24 animate-in fade-in duration-700 pb-20">
            {/* Modern Hero Section */}
            <section className="relative px-6 pt-20 pb-16 md:pt-32 md:pb-32 text-center max-w-5xl mx-auto">
                {/* Background Effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl -z-10">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                    <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/50 text-muted-foreground text-sm font-medium mb-8 backdrop-blur-sm animate-in slide-in-from-bottom-4 fade-in duration-700">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    System Online • v2.0
                </div>

                <h1 className="text-5xl md:text-8xl font-bold tracking-tight mb-8 bg-clip-text text-transparent bg-gradient-to-b from-foreground to-foreground/50 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-100">
                    Secure Your <br />
                    <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                        Digital Frontier
                    </span>
                </h1>

                <p className="text-xl md:text-2xl text-muted-foreground mb-10 leading-relaxed max-w-3xl mx-auto animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-200">
                    Project Vigilion provides enterprise-grade security analysis for the modern web.
                    From static code analysis to realtime infrastructure scanning.
                </p>

                <div className="flex flex-col items-center gap-8 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-300">
                    {/* Animated Character / Mascot */}
                    <div className="relative group cursor-default">
                        <div className="absolute -inset-4 bg-gradient-to-r from-primary/50 to-blue-600/50 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition duration-500 animate-pulse"></div>
                        <div className="relative h-24 w-24 bg-background/80 backdrop-blur-xl border border-primary/50 rounded-2xl flex items-center justify-center shadow-2xl transform transition duration-500 group-hover:scale-110 group-hover:-translate-y-2">
                            {/* Eyes / Visor Animation */}
                            <div className="absolute top-8 w-12 h-3 bg-black/20 rounded-full overflow-hidden">
                                <div className="h-full w-full bg-primary/80 animate-[ping_3s_ease-in-out_infinite] opacity-50"></div>
                            </div>
                            <Bot size={48} className="text-primary relative z-10" />

                            {/* Scanning Effect */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/10 to-transparent h-[200%] w-full animate-[scan_3s_linear_infinite] pointer-events-none"></div>
                        </div>
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">Ready to Scan</Badge>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        variant="ghost"
                        className="h-12 px-8 text-base rounded-full border border-primary/20 bg-primary/5 text-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
                        onClick={() => window.open('/docs/', '_blank')}
                    >
                        Read Documentation <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            </section>

            {/* Bento Grid Features */}
            <section className="max-w-7xl mx-auto px-6">
                <div className="flex items-end justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Security Arsenal</h2>
                        <p className="text-muted-foreground mt-2">Comprehensive tools for every layer of your stack.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Primary Feature - Code Scanner (Large Card) */}
                    <Card
                        className="md:col-span-2 md:row-span-2 group relative overflow-hidden border-border/50 bg-gradient-to-br from-card to-card/50 hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 cursor-pointer"
                        onClick={() => onNavigate?.("code-scanner")}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader className="relative z-10">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                                <Code className="text-primary h-6 w-6" />
                            </div>
                            <CardTitle className="text-2xl">Static Code Analysis</CardTitle>
                            <CardDescription className="text-base">AI-Powered SAST Engine</CardDescription>
                        </CardHeader>
                        <CardContent className="relative z-10">
                            <p className="text-muted-foreground mb-6 max-w-lg">
                                Detect hardcoded secrets, insecure functions, and logic flaws in your source code before deployment.
                                Our scanner utilizes advanced pattern matching and AI heuristics to provide actionable remediation steps.
                            </p>
                            <div className="flex gap-2 flex-wrap">
                                <Badge variant="secondary" className="bg-primary/5 border-primary/10">Secret Detection</Badge>
                                <Badge variant="secondary" className="bg-primary/5 border-primary/10">Vulnerability Scanning</Badge>
                                <Badge variant="secondary" className="bg-primary/5 border-primary/10">Auto-Fix Suggestions</Badge>
                            </div>
                        </CardContent>
                        {/* Decorative Background Element */}
                        <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-500" />
                    </Card>

                    {/* Secondary Feature - Web Scanner */}
                    <Card
                        className="group relative overflow-hidden border-border/50 bg-card/50 hover:bg-card hover:shadow-xl transition-all duration-300 cursor-pointer"
                        onClick={() => onNavigate?.("web-domain")}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader>
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500">
                                <Globe className="text-blue-500 h-5 w-5" />
                            </div>
                            <CardTitle>Web Recon</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Discover subdomains and map attack surfaces.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Secondary Feature - DB Scanner */}
                    <Card
                        className="group relative overflow-hidden border-border/50 bg-card/50 hover:bg-card hover:shadow-xl transition-all duration-300 cursor-pointer"
                        onClick={() => onNavigate?.("database-scanner")}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader>
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500">
                                <Database className="text-orange-500 h-5 w-5" />
                            </div>
                            <CardTitle>Database Audit</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Scan SQL/NoSQL databases for misconfigurations.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Secondary Feature - API Tester */}
                    <Card
                        className="group relative overflow-hidden border-border/50 bg-card/50 hover:bg-card hover:shadow-xl transition-all duration-300 cursor-pointer"
                        onClick={() => onNavigate?.("api-tester")}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader>
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500">
                                <Activity className="text-purple-500 h-5 w-5" />
                            </div>
                            <CardTitle>API Security</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Fuzzing and endpoint security validation.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Secondary Feature - Misconfig Checker */}
                    <Card
                        className="group relative overflow-hidden border-border/50 bg-card/50 hover:bg-card hover:shadow-xl transition-all duration-300 cursor-pointer"
                        onClick={() => onNavigate?.("misconfig-checker")}
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <CardHeader>
                            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-500">
                                <AlertTriangle className="text-yellow-500 h-5 w-5" />
                            </div>
                            <CardTitle>Cloud Compliance</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Check buckets and headers for exposure.
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </section>

            {/* Footer Info */}
            <div className="max-w-7xl mx-auto px-6 mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <Shield className="text-primary h-5 w-5" />
                    <span>Enterprise-Grade Security</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <Lock className="text-primary h-5 w-5" />
                    <span>End-to-End Encryption</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/30 border border-border/50">
                    <Search className="text-primary h-5 w-5" />
                    <span>Deep Inspection Engines</span>
                </div>
            </div>

            <footer className="text-center text-xs text-muted-foreground/40 mt-12">
                &copy; {new Date().getFullYear()} University of Moratuwa • Dept. of CSE • Project Vigilion
            </footer>
        </div>
    )
}
