import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { PageTransition } from "@/components/page-transition"
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
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        <meta name="theme-color" content="#7c3aed" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Quizzy" />
      </head>
      <body className={inter.className}>
        <ThemeProvider 
          attribute="class" 
          defaultTheme="light" 
          enableSystem
          themes={['light', 'dark', 'system', 'blue', 'green', 'purple', 'orange', 'red', 'pink', 'teal']}
          disableTransitionOnChange
        >
          <PageTransition>
            {children}
          </PageTransition>
          {/* <PWAHandler /> */}
        </ThemeProvider>
      </body>
    </html>
  )
}
