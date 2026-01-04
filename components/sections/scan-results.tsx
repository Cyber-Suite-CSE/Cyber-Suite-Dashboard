"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft, // Kept as it's used for "Back to Scan" button
  Globe,
  Server,
  Code,
  Shield,
  Network,
  Lock, // Kept as it's used in the "Security Issues Found" section
  Download, // Kept as it's used for the JSON download button
  FileText,
  Zap, // Added as per instruction
  ChevronRight, // Added as per instruction
  ChevronDown, // Added as per instruction
} from "lucide-react"
import dynamic from 'next/dynamic'
import { PDFReportTemplate } from './pdf-report-template'

// Dynamically import PDF components with SSR disabled to avoid hydration/Next.js build issues
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false }
)

import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ScanResultsProps {
  data: any
  onBack: () => void
}

export function ScanResults({ data, onBack }: ScanResultsProps) {
  const domainEnum = data.modules?.domain_enumeration
  const serviceDiscovery = data.modules?.service_discovery
  const webAnalysis = data.modules?.web_analysis
  const fingerprinting = domainEnum?.modules?.fingerprinting
  const dnsModule = domainEnum?.modules?.dns
  const passiveModule = domainEnum?.modules?.passive

  const totalSubdomains = domainEnum?.all_subdomains?.length || 0
  const openPorts = Object.keys(serviceDiscovery?.service_results?.services || {}).length
  const technologies = fingerprinting?.summary?.unique_technologies || fingerprinting?.unique_technologies || []
  const apis = webAnalysis?.web_crawl?.apis || []
  const securityIssues = fingerprinting?.summary?.common_issues || fingerprinting?.common_issues || []
  const dnsRecords = dnsModule?.dns_records || {}
  const dnsStats = dnsModule?.statistics || {}
  
  // Resilient service stats
  const totalServicesCount = serviceDiscovery?.summary?.services_identified || 
                           serviceDiscovery?.summary?.total_services || 
                           Object.keys(serviceDiscovery?.service_results?.services || {}).length;
                           
  const openPortsCount = serviceDiscovery?.summary?.open_ports_count || openPorts;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm" className="gap-2 bg-transparent">
            <ArrowLeft size={16} />
            Back to Scan
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-foreground">Scan Results</h2>
            <p className="text-sm text-muted-foreground">Target: {data.target_domain}</p>
            <p className="text-xs text-muted-foreground mt-1">Execution Time: {data.execution_time?.toFixed(2)}s</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-300"
            onClick={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `scan-results-${data.target_domain}-${new Date().toISOString().split('T')[0]}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
          >
            <Download size={16} />
            JSON
          </Button>

          <PDFDownloadLink
            document={<PDFReportTemplate data={data} />}
            fileName={`scan-report-${data.target_domain}-${new Date().toISOString().split('T')[0]}.pdf`}
          >
            {({ loading }: { loading: boolean }) => (
              <Button 
                variant="outline" 
                size="sm" 
                disabled={loading}
                className="gap-2 border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-300"
              >
                <FileText size={16} />
                {loading ? 'Preparing...' : 'PDF'}
              </Button>
            )}
          </PDFDownloadLink>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subdomains</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{totalSubdomains}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Ports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{openPorts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Technologies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{technologies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">APIs Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-accent">{apis.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Results */}
      <Tabs defaultValue="domain" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="domain" className="gap-2">
            <Globe size={16} />
            <span className="hidden sm:inline">Domain</span>
          </TabsTrigger>
          <TabsTrigger value="dns" className="gap-2">
            <Network size={16} />
            <span className="hidden sm:inline">DNS</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Server size={16} />
            <span className="hidden sm:inline">Services</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <span className="text-lg font-bold">{"{}"}</span>
            <span className="hidden sm:inline">API</span>
          </TabsTrigger>
          <TabsTrigger value="recon" className="gap-2">
            <Zap size={16} />
            <span className="hidden sm:inline">Recon</span>
          </TabsTrigger>
          <TabsTrigger value="tech" className="gap-2">
            <Code size={16} />
            <span className="hidden sm:inline">Tech</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield size={16} />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* Domain Enumeration */}
        <TabsContent value="domain" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subdomains Found</CardTitle>
              <CardDescription>{totalSubdomains} unique subdomains discovered</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96 w-full rounded-md border border-border p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {domainEnum?.all_subdomains?.map((subdomain: string) => (
                    <Badge key={subdomain} variant="secondary" className="text-xs justify-center">
                      {subdomain}
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Passive Reconnaissance */}
          {passiveModule && (
            <Card>
              <CardHeader>
                <CardTitle>Passive Reconnaissance</CardTitle>
                <CardDescription>Certificate Transparency & Public Records</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Certificates Analyzed</h4>
                  <p className="text-sm text-muted-foreground">
                    {passiveModule.statistics?.certificates_analyzed || 0} certificates
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-2">CT Logs Processed</h4>
                  <p className="text-sm text-muted-foreground">
                    {passiveModule.statistics?.ct_logs_processed || 0} logs
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* DNS Records */}
        <TabsContent value="dns" className="space-y-4">
          {dnsModule?.dns_records && (
            <Card>
              <CardHeader>
                <CardTitle>DNS Records</CardTitle>
                <CardDescription>{dnsModule.statistics?.total_records || 0} total records found</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {Object.entries(dnsModule.dns_records).map(([type, records]: [string, any]) => (
                  <div key={type}>
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Badge variant="outline">{type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {Array.isArray(records) ? records.length : 1} record(s)
                      </span>
                    </h4>
                    <ScrollArea className="h-40 w-full rounded-md border border-border p-3">
                      <div className="space-y-1">
                        {Array.isArray(records) ? (
                          records.map((record: string, idx: number) => (
                            <p key={idx} className="text-sm text-muted-foreground font-mono break-all">
                              {record}
                            </p>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground font-mono">{records}</p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* DNS Analysis */}
          {dnsModule?.analysis && (
            <Card>
              <CardHeader>
                <CardTitle>DNS Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dnsModule.analysis.txt_analysis?.spf && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">SPF Records</h4>
                    <div className="space-y-1">
                      {dnsModule.analysis.txt_analysis.spf.map((record: string, idx: number) => (
                        <p key={idx} className="text-sm text-muted-foreground font-mono break-all">
                          {record}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {dnsModule.analysis.txt_analysis?.dmarc && dnsModule.analysis.txt_analysis.dmarc.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">DMARC Records</h4>
                    <div className="space-y-1">
                      {dnsModule.analysis.txt_analysis.dmarc.map((record: string, idx: number) => (
                        <p key={idx} className="text-sm text-muted-foreground font-mono break-all">
                          {record}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Services */}
        <TabsContent value="services" className="space-y-4">
          {(serviceDiscovery?.service_results?.services || serviceDiscovery?.services) && (
            <Card>
              <CardHeader>
                <CardTitle>Open Services</CardTitle>
                <CardDescription>{openPortsCount} services identified</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(serviceDiscovery?.service_results?.services || serviceDiscovery?.services || {}).map(([port, service]: [string, any]) => (
                    <div key={port} className="p-4 rounded-lg border border-border bg-card/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-accent/10">
                            <Server size={18} className="text-accent" />
                          </div>
                          <div>
                            <p className="font-bold text-lg">{service.service}</p>
                            <p className="text-sm text-muted-foreground">Port {port} • TCP</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={service.ssl ? "default" : "secondary"}>
                            {service.ssl ? "SSL/TLS" : "Plain"}
                          </Badge>
                          {service.version && (
                            <Badge variant="outline" className="border-accent/40 text-accent">
                              {service.version}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Detailed Info */}
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-background/40 p-3 rounded border border-border/50">
                        {service.banner && service.banner !== "No banner" && (
                          <div className="col-span-1 md:col-span-2">
                            <span className="text-muted-foreground block mb-1">Banner</span>
                            <code className="text-xs break-all block p-2 bg-background rounded">{service.banner}</code>
                          </div>
                        )}
                        
                        {service.protocol_info?.http && (
                          <>
                            <div>
                              <span className="text-muted-foreground block">HTTP Server</span>
                              <span className="font-mono">{service.protocol_info.http.server || "Unknown"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">Status Code</span>
                              <span className="font-mono">{service.protocol_info.http.status_code || "Unknown"}</span>
                            </div>
                          </>
                        )}
                        
                        {service.protocol_info?.ssl && (
                          <>
                            <div>
                              <span className="text-muted-foreground block">SSL Cipher</span>
                              <span className="font-mono">{service.protocol_info.ssl.cipher || "Unknown"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground block">SSL Subject</span>
                              <span className="font-mono">{service.protocol_info.ssl.subject || "Unknown"}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Summary */}
          {(serviceDiscovery?.summary || serviceDiscovery?.service_results) && (
            <Card>
              <CardHeader>
                <CardTitle>Service Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Services Identified</span>
                  <span className="font-semibold">{totalServicesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Open Ports Count</span>
                  <span className="font-semibold">{openPortsCount}</span>
                </div>
                {serviceDiscovery?.summary?.ssl_services?.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm">SSL/TLS Services</span>
                    <span className="font-semibold">{serviceDiscovery.summary.ssl_services.length}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Technology Stack */}
        <TabsContent value="tech" className="space-y-4">
          {technologies.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Detected Technologies</CardTitle>
                <CardDescription>{technologies.length} technologies identified with version details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {technologies.map((tech: any) => {
                    const techName = typeof tech === 'string' ? tech : tech.name;
                    const techVersion = typeof tech === 'object' ? tech.version : null;
                    const techCats = typeof tech === 'object' ? tech.categories : [];
                    
                    return (
                      <div key={techName} className="p-3 rounded-lg border border-border bg-card/50 flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold">{techName}</span>
                          {techVersion && (
                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                              {techVersion}
                            </Badge>
                          )}
                        </div>
                        {techCats && techCats.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {techCats.map((cat: string) => (
                              <span key={cat} className="text-[9px] text-muted-foreground uppercase tracking-wider bg-muted px-1 rounded">
                                {cat}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
               <CardContent className="pt-6 text-center text-muted-foreground">
                 No technologies detected.
               </CardContent>
            </Card>
          )}

          {/* CDN Detection */}
          {webAnalysis?.cdn_detection && (
            <Card>
              <CardHeader>
                <CardTitle>CDN Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm">CDN Detected</span>
                  <Badge variant={webAnalysis.cdn_detection.cdn_detected ? "default" : "secondary"}>
                    {webAnalysis.cdn_detection.cdn_name || "None"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* API Discovery (New Dedicated Tab) */}
        <TabsContent value="api" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Discovered APIs</CardTitle>
                <CardDescription>{apis.length} API endpoints found across all categories</CardDescription>
              </CardHeader>
              <CardContent>
                {webAnalysis?.web_crawl?.api_discovery ? (
                   <div className="space-y-6">
                      {/* REST APIs */}
                      {webAnalysis.web_crawl.api_discovery.rest_apis?.length > 0 && (
                        <div>
                           <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                             <Badge variant="outline">REST</Badge>
                             <span className="text-muted-foreground">{webAnalysis.web_crawl.api_discovery.rest_apis.length} endpoints</span>
                           </h4>
                           <ScrollArea className="h-40 w-full rounded-md border border-border p-3">
                             <div className="space-y-1">
                               {webAnalysis.web_crawl.api_discovery.rest_apis.map((api: any, idx: number) => (
                                 <div key={idx} className="text-xs font-mono text-muted-foreground break-all p-1 hover:bg-muted/50 rounded">
                                   {typeof api === 'string' ? api : api.url}
                                 </div>
                               ))}
                             </div>
                           </ScrollArea>
                        </div>
                      )}

                      {/* GraphQL */}
                      {webAnalysis.web_crawl.api_discovery.graphql_endpoints?.length > 0 && (
                        <div>
                           <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                             <Badge variant="outline">GraphQL</Badge>
                             <span className="text-muted-foreground">{webAnalysis.web_crawl.api_discovery.graphql_endpoints.length} endpoints</span>
                           </h4>
                           <ScrollArea className="h-40 w-full rounded-md border border-border p-3">
                             <div className="space-y-1">
                               {webAnalysis.web_crawl.api_discovery.graphql_endpoints.map((api: any, idx: number) => (
                                 <div key={idx} className="text-xs font-mono text-muted-foreground break-all p-1 hover:bg-muted/50 rounded">
                                   {typeof api === 'string' ? api : api.url}
                                 </div>
                               ))}
                             </div>
                           </ScrollArea>
                        </div>
                      )}

                      {/* Swagger */}
                      {webAnalysis.web_crawl.api_discovery.swagger_endpoints?.length > 0 && (
                        <div>
                           <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                             <Badge variant="outline">Swagger/OpenAPI</Badge>
                             <span className="text-muted-foreground">{webAnalysis.web_crawl.api_discovery.swagger_endpoints.length} docs</span>
                           </h4>
                            <ScrollArea className="h-32 w-full rounded-md border border-border p-3">
                             <div className="space-y-1">
                               {webAnalysis.web_crawl.api_discovery.swagger_endpoints.map((api: any, idx: number) => (
                                 <div key={idx} className="text-xs font-mono text-muted-foreground break-all p-1 hover:bg-muted/50 rounded">
                                   {typeof api === 'string' ? api : api.url}
                                 </div>
                               ))}
                             </div>
                           </ScrollArea>
                        </div>
                      )}

                      {/* Other APIs */}
                      {webAnalysis.web_crawl.api_discovery.other_apis?.length > 0 && (
                        <div>
                           <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                             <Badge variant="outline">Other</Badge>
                             <span className="text-muted-foreground">{webAnalysis.web_crawl.api_discovery.other_apis.length} endpoints</span>
                           </h4>
                           <ScrollArea className="h-40 w-full rounded-md border border-border p-3">
                             <div className="space-y-1">
                               {webAnalysis.web_crawl.api_discovery.other_apis.map((api: any, idx: number) => (
                                 <div key={idx} className="text-xs font-mono text-muted-foreground break-all p-1 hover:bg-muted/50 rounded">
                                   {typeof api === 'string' ? api : api.url}
                                 </div>
                               ))}
                             </div>
                           </ScrollArea>
                        </div>
                      )}
                      
                      {/* Fallback if structure is missing but we have apis list */}
                      {(!webAnalysis.web_crawl.api_discovery.rest_apis && apis.length > 0) && (
                         <ScrollArea className="h-96 w-full rounded-md border border-border p-3">
                          <div className="space-y-2">
                            {apis.map((api: any, idx: number) => (
                              <div key={idx} className="p-2 rounded bg-muted text-xs font-mono text-muted-foreground break-all">
                                {typeof api === 'string' ? api : (api.url || api.endpoint || JSON.stringify(api))}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                   </div>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        {apis.length > 0 ? (
                             <ScrollArea className="h-96 w-full rounded-md border border-border p-3">
                              <div className="space-y-2">
                                {apis.map((api: any, idx: number) => (
                                  <div key={idx} className="p-2 rounded bg-muted text-xs font-mono text-muted-foreground break-all">
                                    {typeof api === 'string' ? api : (api.url || api.endpoint || JSON.stringify(api))}
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                        ) : (
                            "No API endpoints discovered."
                        )}
                    </div>
                )}
              </CardContent>
            </Card>
        </TabsContent>

        {/* Recon / Web Crawl */}
        <TabsContent value="recon" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Crawled Pages</CardTitle>
                <CardDescription>{webAnalysis?.web_crawl?.pages?.length || 0} pages analyzed</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full rounded-md border border-border p-3">
                  <div className="space-y-2">
                    {webAnalysis?.web_crawl?.pages?.map((page: any, idx: number) => (
                      <div key={idx} className="p-2 rounded bg-muted/50 border border-border">
                        <p className="text-xs font-mono break-all font-semibold">{page.url}</p>
                        {page.title && <p className="text-[10px] text-muted-foreground mt-1">Title: {page.title}</p>}
                        {page.status_code && <Badge variant="outline" className="text-[8px] mt-1">{page.status_code}</Badge>}
                      </div>
                    ))}
                    {(!webAnalysis?.web_crawl?.pages || webAnalysis.web_crawl.pages.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">No pages crawled.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Discovered URLs</CardTitle>
                <CardDescription>{webAnalysis?.web_crawl?.discovered_urls?.length || 0} unique URLs found</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96 w-full rounded-md border border-border p-3">
                  <div className="space-y-1">
                    {webAnalysis?.web_crawl?.discovered_urls?.slice(0, 30).map((url: string, idx: number) => (
                      <div key={idx} className="text-[10px] font-mono text-muted-foreground break-all py-1 border-b border-border/50 last:border-0">
                        {url}
                      </div>
                    ))}
                    {(!webAnalysis?.web_crawl?.discovered_urls || webAnalysis.web_crawl.discovered_urls.length === 0) && (
                      <p className="text-sm text-muted-foreground text-center py-4">No URLs discovered.</p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {webAnalysis?.web_crawl?.target_specific_terms && (
            <Card>
              <CardHeader>
                <CardTitle>Target-Specific Keywords</CardTitle>
                <CardDescription>AI-generated wordlist for this target</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {webAnalysis.web_crawl.target_specific_terms.map((term: string, idx: number) => (
                    <Badge key={idx} variant="secondary" className="text-xs font-mono">
                      {term}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security Issues */}
        <TabsContent value="security" className="space-y-4">
          {securityIssues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Security Issues Found</CardTitle>
                <CardDescription>{securityIssues.length} issues detected</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {securityIssues.map((issue: string) => (
                    <div
                      key={issue}
                      className="flex items-center gap-2 p-2 rounded bg-muted/50 border border-accent/20"
                    >
                      <Lock size={16} className="text-accent flex-shrink-0" />
                      <span className="text-sm">{issue}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CDN Detection */}
          {webAnalysis?.cdn_detection && (
            <Card>
              <CardHeader>
                <CardTitle>CDN Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm">CDN Detected</span>
                  <Badge variant={webAnalysis.cdn_detection.cdn_detected ? "default" : "secondary"}>
                    {webAnalysis.cdn_detection.cdn_name || "None"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fingerprinting Summary */}
          {fingerprinting?.summary && (
            <Card>
              <CardHeader>
                <CardTitle>Security Score</CardTitle>
                <CardDescription>Overall web security posture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Score</span>
                  <span className="text-2xl font-bold text-accent">{fingerprinting.summary.security_score_avg.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm text-muted-foreground">SSL Encrypted Targets</span>
                  <Badge variant="outline">{fingerprinting.summary.ssl_enabled} / {fingerprinting.summary.total_targets}</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}