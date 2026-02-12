"use client"

import { useState } from "react"
import { Globe, AlertTriangle, Database, Zap, Code, Settings, Menu, Shield, ChevronLeft, ChevronRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SidebarProps {
  activeNav: string
  onNavChange: (nav: string) => void
}

const navItems = [
  { id: "welcome", label: "Welcome", icon: Home },
  { id: "web-domain", label: "Web Domain Scanner", icon: Globe },
  { id: "database", label: "Database Scanner", icon: Database },
  { id: "misconfig-checker", label: "Misconfig Checker", icon: AlertTriangle },
  { id: "api", label: "API Tester", icon: Zap },
  { id: "code", label: "Code Scanner", icon: Code },
  { id: "settings", label: "Settings", icon: Settings },
]

export function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(true) // For mobile
  const [isCollapsed, setIsCollapsed] = useState(false) // For desktop

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-accent text-accent-foreground"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col overflow-hidden
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "w-20" : "w-64"}
        `}
      >
        {/* Logo */}
        <div className={`p-4 border-b border-sidebar-border flex items-center gap-3 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="w-10 h-10 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield size={24} className="text-primary" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 overflow-hidden">
              <h1 className="font-bold text-lg text-sidebar-foreground truncate">Cyber - CSE @ UoM</h1>
              <p className="text-xs text-muted-foreground truncate">Cyber Security Stream</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavChange(item.id)
                  setIsOpen(false)
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                  ${isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }
                  ${isCollapsed ? "justify-center" : ""}
                `}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon size={20} className="shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium text-sm truncate">{item.label}</span>
                )}
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border shadow-sm">
                    {item.label}
                  </div>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer / Collapse Toggle */}
        <div className="p-4 border-t border-sidebar-border relative">
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-8 hidden lg:flex items-center justify-center"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>

          {!isCollapsed && (
            <div className="mt-4 text-xs text-center text-muted-foreground">
              <p>v1.0.0</p>
              <p suppressHydrationWarning>© {new Date().getFullYear()} Project Vigilion</p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
