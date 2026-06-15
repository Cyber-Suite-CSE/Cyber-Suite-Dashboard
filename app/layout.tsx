import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { SuiteHealthProvider } from "@/context/SuiteHealthContext"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Project Vigilion",
  description: "Cyber Security Steam Students at Computer Science and Engineering Department, University of Moratuwa, Sri Lanka"
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
          <SuiteHealthProvider>
            {children}
          </SuiteHealthProvider>
        <Analytics />
      </body>
    </html>
  )
}
