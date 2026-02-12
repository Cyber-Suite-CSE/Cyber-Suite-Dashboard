"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"
import { WebDomainScanner } from "@/components/sections/web-domain-scanner"
import { MisconfigChecker } from "@/components/sections/misconfig-checker"
import { DatabaseScanner } from "@/components/sections/database-scanner"
import { APIChecker } from "@/components/sections/api-tester"
import { CodeScanner } from "@/components/sections/code-scanner"
import { Settings } from "@/components/sections/settings"
import { Welcome } from "@/components/sections/welcome"

type NavigationItem = "welcome" | "web-domain" | "misconfig-checker" | "database" | "api" | "code"

export default function Home() {
  const [activeNav, setActiveNav] = useState<NavigationItem>("welcome")
  const [userEmail, setUserEmail] = useState<string>("")

  useEffect(() => {
    // Simulate loading user email from session/auth
    const savedEmail = localStorage.getItem("userEmail")
    if (savedEmail) {
      setUserEmail(savedEmail)
    }
  }, [])

  const renderContent = () => {
    switch (activeNav) {
      case "welcome":
        return <Welcome onNavigate={(nav) => setActiveNav(nav as NavigationItem)} />
      case "web-domain":
        return <WebDomainScanner />
      case "misconfig-checker":
        return <MisconfigChecker />
      case "database":
        return <DatabaseScanner />
      case "api":
        return <APIChecker />
      case "code":
        return <CodeScanner />
      // case "settings":
      //   return <Settings />
      default:
        return <Welcome onNavigate={(nav) => setActiveNav(nav as NavigationItem)} />
    }
  }

  return (
    <DashboardLayout
      activeNav={activeNav}
      onNavChange={(nav: string) => setActiveNav(nav as NavigationItem)}
      userEmail={userEmail}
    >
      {renderContent()}
    </DashboardLayout>
  )
}
