"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Shield,
    Globe,
    Database,
    AlertTriangle,
    Zap,
    Code,
    ArrowRight,
    Lock,
    Server,
    Terminal,
    Cpu,
    Activity,
    Layers,
    CheckCircle2
} from "lucide-react"

interface WelcomeProps {
    onNavigate?: (nav: string) => void
}

export function Welcome({ onNavigate }: WelcomeProps) {
    return (
        <div className="space-y-12 animate-in fade-in duration-700">
            {/* Hero Section */}
            <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background via-muted/50 to-background border border-border/50 p-8 md:p-16 text-center md:text-left shadow-2xl">
                {/* Animated Background Elements */}
                <div className="absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-40 animate-pulse duration-[5000ms]"></div>
                <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl opacity-40 animate-pulse delay-1000 duration-[7000ms]"></div>

                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>

                <div className="relative z-10 max-w-4xl mx-auto md:mx-0">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8 border border-primary/20 animate-in slide-in-from-bottom-4 fade-in duration-700">
                        <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                        </span>
                        System Operational • v1.0.0
                    </div>

                    <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-100">
                        Project <span className="text-primary">Vigilion</span>
                    </h1>

                    <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed max-w-2xl animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-200">
                        The Developer's All-in-One Cyber Security Suite.
                        Testing, monitoring, and securing digital infrastructure for the modern web.
                    </p>

                    <div className="flex flex-wrap gap-3 mb-10 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-300">
                        <Badge variant="outline" className="px-3 py-1 text-sm bg-background/50 backdrop-blur">CSE</Badge>
                        <Badge variant="outline" className="px-3 py-1 text-sm bg-background/50 backdrop-blur">Cyber Security Stream</Badge>
                        <Badge variant="outline" className="px-3 py-1 text-sm bg-background/50 backdrop-blur">University of Moratuwa</Badge>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-400">
                        <Button size="lg" className="h-12 px-8 text-base gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105" onClick={() => onNavigate?.("web-domain")}>
                            Initialize Scan <ArrowRight size={18} />
                        </Button>
                        <Button size="lg" variant="outline" className="h-12 px-8 text-base gap-2 backdrop-blur-sm bg-background/50 hover:bg-background/80 transition-all hover:scale-105" onClick={() => window.open('https://github.com/Cyber-Suite-CSE', '_blank')}>
                            GitHub Repo <Terminal size={18} />
                        </Button>
                    </div>
                </div>
            </section>

            {/* Architecture / Capabilities Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-12 fade-in duration-1000 delay-500">
                <div className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                        <Layers className="text-blue-500" size={28} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Full-Stack Coverage</h3>
                    <p className="text-muted-foreground text-sm">From frontend code analysis to backend database auditing and network infrastructure scanning.</p>
                </div>
                <div className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                        <Cpu className="text-purple-500" size={28} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">AI-Powered Analysis</h3>
                    <p className="text-muted-foreground text-sm">Leveraging advanced heuristics and machine learning models to detect complex vulnerability patterns.</p>
                </div>
                <div className="group p-6 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
                    <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-500">
                        <Activity className="text-green-500" size={28} />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Real-time Reporting</h3>
                    <p className="text-muted-foreground text-sm">Instant feedback on security posture with actionable remediation steps and comprehensive logs.</p>
                </div>
            </div>

            {/* Main Modules Grid */}
            <div className="space-y-6 animate-in slide-in-from-bottom-12 fade-in duration-1000 delay-700">
                <div className="flex items-center gap-2 mb-2">
                    <Server size={20} className="text-primary" />
                    <h2 className="text-2xl font-bold">Security Modules</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="group hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 border-border/60 hover:border-blue-500/30 bg-gradient-to-b from-card to-card/50">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Globe className="text-blue-500" size={24} />
                            </div>
                            <CardTitle>Web Domain Scanner</CardTitle>
                            <CardDescription>Reconnaissance & Surface Mapping</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Discover subdomains, analyze headers, map attack surfaces, and identify potential vulnerabilities in your web presence.
                            </p>
                            <Button variant="ghost" className="w-full justify-between group-hover:text-blue-500 hover:bg-blue-500/10" onClick={() => onNavigate?.("web-domain")}>
                                Open Utility <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="group hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 border-border/60 hover:border-orange-500/30 bg-gradient-to-b from-card to-card/50">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-orange-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Database className="text-orange-500" size={24} />
                            </div>
                            <CardTitle>Database Scanner</CardTitle>
                            <CardDescription>SQL & NoSQL Audit Engine</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Detect SQL injection flaws, weak configurations, and exposed data in your database infrastructure using advanced heuristics.
                            </p>
                            <Button variant="ghost" className="w-full justify-between group-hover:text-orange-500 hover:bg-orange-500/10" onClick={() => onNavigate?.("database-scanner")}>
                                Open Utility <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="group hover:shadow-xl hover:shadow-yellow-500/5 transition-all duration-300 border-border/60 hover:border-yellow-500/30 bg-gradient-to-b from-card to-card/50">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <AlertTriangle className="text-yellow-500" size={24} />
                            </div>
                            <CardTitle>Misconfig Checker</CardTitle>
                            <CardDescription>Cloud & Infra Compliance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Scan for common deployment misconfigurations, insecure headers, and cloud bucket exposures that leave you vulnerable.
                            </p>
                            <Button variant="ghost" className="w-full justify-between group-hover:text-yellow-500 hover:bg-yellow-500/10" onClick={() => onNavigate?.("misconfig-checker")}>
                                Open Utility <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="group hover:shadow-xl hover:shadow-purple-500/5 transition-all duration-300 border-border/60 hover:border-purple-500/30 bg-gradient-to-b from-card to-card/50">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Zap className="text-purple-500" size={24} />
                            </div>
                            <CardTitle>API Tester</CardTitle>
                            <CardDescription>Endpoint Security Validation</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Validate API endpoints for security flaws, improper auth, IDOR, and rate limiting issues with automated test suites.
                            </p>
                            <Button variant="ghost" className="w-full justify-between group-hover:text-purple-500 hover:bg-purple-500/10" onClick={() => onNavigate?.("api-tester")}>
                                Open Utility <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="group hover:shadow-xl hover:shadow-green-500/5 transition-all duration-300 border-border/60 hover:border-green-500/30 bg-gradient-to-b from-card to-card/50">
                        <CardHeader>
                            <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Code className="text-green-500" size={24} />
                            </div>
                            <CardTitle>Code Scanner</CardTitle>
                            <CardDescription>Static Code Analysis (SAST)</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground mb-4">
                                Analyze source code for hardcoded secrets, insecure functions, and logic flaws before deployment. Powered by AI agents.
                            </p>
                            <Button variant="ghost" className="w-full justify-between group-hover:text-green-500 hover:bg-green-500/10" onClick={() => onNavigate?.("code-scanner")}>
                                Open Utility <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Footer / Branding Section */}
            <div className="animate-in slide-in-from-bottom-12 fade-in duration-1000 delay-900 border-t border-border/50 pt-12 mt-12">
                <div className="grid md:grid-cols-2 gap-12">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                                <Shield className="text-primary-foreground h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Project Vigilion</h3>
                                <p className="text-xs text-muted-foreground tracking-widest uppercase">Cyber Security Stream • Batch '21</p>
                            </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed mb-6">
                            Project Vigilion aims to bridge the gap between complex enterprise security tooling and intuitive developer experiences.
                            Built with precision by the students of the Department of Computer Science and Engineering.
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-primary" /> Enterprise Ready</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-primary" /> Open Source</span>
                            <span className="flex items-center gap-1.5"><CheckCircle2 size={14} className="text-primary" /> MIT Licensed</span>
                        </div>
                    </div>

                    <div className="bg-muted/30 rounded-2xl p-6 border border-border/50">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                            System Status
                        </h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">API Gateway</span>
                                <span className="text-green-500 font-mono text-xs">ONLINE</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Scanner Engines</span>
                                <span className="text-green-500 font-mono text-xs">READY</span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Database Uplink</span>
                                <span className="text-green-500 font-mono text-xs">CONNECTED</span>
                            </div>
                            <div className="w-full bg-muted h-1.5 rounded-full mt-4 overflow-hidden">
                                <div className="bg-primary h-full w-[25%] animate-[loading_2s_ease-in-out_infinite]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center mt-12 text-xs text-muted-foreground/50">
                    &copy; {new Date().getFullYear()} University of Moratuwa • Department of Computer Science & Engineering
                </div>
            </div>
        </div>
    )
}
