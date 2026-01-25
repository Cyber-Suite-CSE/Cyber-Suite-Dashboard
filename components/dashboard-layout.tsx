"use client"

import React from "react"

import { useState } from "react"
import { Sidebar } from "./sidebar"
import { TopBar } from "./top-bar"


interface DashboardLayoutProps {
  activeNav: string
  onNavChange: (nav: string) => void
  userEmail: string
  // onLogout removed
  children: React.ReactNode
}

export function DashboardLayout({ activeNav, onNavChange, userEmail, children }: DashboardLayoutProps) {


  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar */}
      <Sidebar activeNav={activeNav} onNavChange={onNavChange} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with User Profile */}
        <TopBar userEmail={userEmail} />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {React.isValidElement(children)
              ? React.cloneElement(children as React.ReactElement)
              : children}
          </div>
        </main>
      </div>
    </div>
  )
}
