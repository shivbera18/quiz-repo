import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import PWAHandler from "@/components/pwa-handler"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Banking Exam Preparation",
  description: "Comprehensive banking exam preparation platform",
  generator: 'v0.dev',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Quiz App',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'Quiz App',
    title: 'Banking Exam Preparation',
    description: 'Comprehensive banking exam preparation platform',
  },
  twitter: {
    card: 'summary',
    title: 'Banking Exam Preparation',
    description: 'Comprehensive banking exam preparation platform',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#7c3aed',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="light" 
          enableSystem
          themes={['light', 'dark', 'system', 'blue', 'green', 'purple', 'orange', 'red', 'pink', 'teal']}
          disableTransitionOnChange
        >
          {children}
          <PWAHandler />
        </ThemeProvider>
      </body>
    </html>
  )
}
