"use client"

import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

// Define styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  subtitle: {
    fontSize: 12,
    color: '#666666',
    marginTop: 5,
  },
  section: {
    marginTop: 15,
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    backgroundColor: '#333333',
    color: '#ffffff',
    padding: 4,
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
  },
  item: {
    fontSize: 8,
    marginBottom: 2,
    color: '#333333',
  },
  mono: {
    fontSize: 8,
    fontFamily: 'Courier',
    marginBottom: 2,
    color: '#444444',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  summaryCard: {
    width: '25%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 7,
    color: '#666666',
    textTransform: 'uppercase',
  },
  cardValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 3,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    minHeight: 18,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: '#f5f5f5',
    fontWeight: 'bold',
  },
  tableCol: {
    padding: 4,
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  tableCell: {
    fontSize: 8,
  },
  badge: {
    padding: 2,
    fontSize: 7,
    borderRadius: 3,
    backgroundColor: '#f0f0f0',
    marginRight: 4,
    marginBottom: 2,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    fontSize: 7,
    textAlign: 'center',
    color: '#999999',
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    paddingTop: 8,
  }
})

export function PDFReportTemplate({ data }: { data: any }) {
  const domainEnum = data.modules?.domain_enumeration
  const serviceDiscovery = data.modules?.service_discovery
  const webAnalysis = data.modules?.web_analysis
  const fingerprinting = domainEnum?.modules?.fingerprinting
  const dnsModule = domainEnum?.modules?.dns
  
  const totalSubdomains = domainEnum?.all_subdomains?.length || 0
  
  // Resilient service stats
  const services = serviceDiscovery?.service_results?.services || {}
  const openPortsCount = serviceDiscovery?.summary?.open_ports_count || 
                        serviceDiscovery?.summary?.total_ports || 
                        Object.keys(services).length
                        
  const technologies = fingerprinting?.summary?.unique_technologies || fingerprinting?.unique_technologies || []
  const apis = webAnalysis?.web_crawl?.apis || []
  const securityIssues = fingerprinting?.summary?.common_issues || fingerprinting?.common_issues || []

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Detailed Security Assessment Report</Text>
          <Text style={styles.subtitle}>Target Domain: {data.target_domain}</Text>
          <Text style={styles.subtitle}>Scan Date: {new Date().toLocaleString()}</Text>
          <Text style={styles.subtitle}>Total Execution Time: {data.execution_time?.toFixed(2)}s</Text>
        </View>

        {/* Executive Summary */}
        <View style={styles.summaryGrid} wrap={false}>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Subdomains</Text>
            <Text style={styles.cardValue}>{totalSubdomains}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Open Ports</Text>
            <Text style={styles.cardValue}>{openPortsCount}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>Technologies</Text>
            <Text style={styles.cardValue}>{technologies.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>API Endpoints</Text>
            <Text style={styles.cardValue}>{apis.length}</Text>
          </View>
        </View>

        {/* DNS Records */}
        {dnsModule?.dns_records && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>DNS Information</Text>
            {Object.entries(dnsModule.dns_records).map(([type, records]: [string, any]) => (
              <View key={type} style={{ marginBottom: 5 }}>
                <Text style={styles.subSectionTitle}>{type} Records</Text>
                {Array.isArray(records) ? (
                  records.slice(0, 15).map((record: string, idx: number) => (
                    <Text key={idx} style={styles.mono}>{record}</Text>
                  ))
                ) : (
                  <Text style={styles.mono}>{records}</Text>
                )}
                {Array.isArray(records) && records.length > 15 && (
                  <Text style={styles.item}>... and {records.length - 15} more</Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Subdomains */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Discovered Subdomains</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {domainEnum?.all_subdomains?.slice(0, 80).map((sub: string, idx: number) => (
              <View key={idx} style={[styles.badge, { width: '24%' }]}>
                <Text style={{ fontSize: 7 }}>{sub}</Text>
              </View>
            ))}
            {totalSubdomains > 80 && (
              <Text style={styles.item}>... and {totalSubdomains - 80} more</Text>
            )}
          </View>
        </View>

        {/* Services */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Network Services</Text>
          {Object.entries(serviceDiscovery?.service_results?.services || {}).length > 0 ? (
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>Port</Text></View>
                <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCell}>Service</Text></View>
                <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>SSL</Text></View>
                <View style={[styles.tableCol, { width: '45%', borderRightWidth: 0 }]}><Text style={styles.tableCell}>Version/Banner</Text></View>
              </View>
              {Object.entries(serviceDiscovery.service_results.services).slice(0, 25).map(([port, service]: [string, any]) => (
                <View key={port} style={styles.tableRow}>
                  <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{service.port || port}</Text></View>
                  <View style={[styles.tableCol, { width: '25%' }]}><Text style={styles.tableCell}>{service.service || '-'}</Text></View>
                  <View style={[styles.tableCol, { width: '15%' }]}><Text style={styles.tableCell}>{service.ssl ? 'Yes' : 'No'}</Text></View>
                  <View style={[styles.tableCol, { width: '45%', borderRightWidth: 0 }]}><Text style={styles.tableCell}>{service.version || service.banner || '-'}</Text></View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.item}>No open services found.</Text>
          )}
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>API Discovery Results</Text>
          <View style={{ marginBottom: 5 }}>
            {apis.slice(0, 40).map((api: any, idx: number) => {
              const apiUrl = typeof api === 'string' ? api : (api.url || api.endpoint || '');
              const method = typeof api === 'object' && api.method ? ` [${api.method}]` : '';
              return (
                <Text key={idx} style={styles.mono}>• {apiUrl}{method}</Text>
              );
            })}
            {apis.length > 40 && (
              <Text style={styles.item}>... and {apis.length - 40} more endpoints discovered</Text>
            )}
            {apis.length === 0 && (
              <Text style={styles.item}>No API endpoints discovered.</Text>
            )}
          </View>
        </View>

        {/* Recon Section */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Web Reconnaissance</Text>
          <Text style={styles.subSectionTitle}>Crawled Pages ({webAnalysis?.web_crawl?.pages?.length || 0})</Text>
          {webAnalysis?.web_crawl?.pages?.slice(0, 15).map((page: any, idx: number) => (
            <Text key={idx} style={styles.item}>- {page.url} {page.title ? `(${page.title})` : ''}</Text>
          ))}
          
          <Text style={styles.subSectionTitle}>Discovered URLs ({webAnalysis?.web_crawl?.discovered_urls?.length || 0})</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
             {webAnalysis?.web_crawl?.discovered_urls?.slice(0, 30).map((url: string, idx: number) => (
               <Text key={idx} style={[styles.item, { fontSize: 6, width: '33%' }]}>{url.length > 40 ? url.substring(0, 37) + '...' : url}</Text>
             ))}
          </View>
        </View>

        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Technology Stack</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {technologies.map((tech: any, idx: number) => {
              const name = typeof tech === 'string' ? tech : tech.name;
              const version = typeof tech === 'object' && tech.version ? ` (${tech.version})` : '';
              return (
                <View key={idx} style={[styles.badge, { backgroundColor: '#e3f2fd' }]}>
                  <Text style={{ fontSize: 8, color: '#1976d2' }}>{name}{version}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Security Issues */}
        <View style={styles.section} wrap={false}>
          <Text style={styles.sectionTitle}>Potential Security Issues</Text>
          {securityIssues.length > 0 ? (
            securityIssues.map((issue: string, idx: number) => (
              <Text key={idx} style={[styles.item, { color: '#d32f2f' }]}>[!] {issue}</Text>
            ))
          ) : (
            <Text style={styles.item}>No common security issues identified by automated fingerprinting.</Text>
          )}
        </View>

        <Text style={styles.footer} render={({ pageNumber, totalPages }) => (
          `CyberSuite Confidential - Page ${pageNumber} of ${totalPages} - Generated by AI-Enhanced Recon Toolkit`
        )} fixed />
      </Page>
    </Document>
  )
}
