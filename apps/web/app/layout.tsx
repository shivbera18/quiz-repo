import type React from "react"
import type { Metadata, Viewport } from "next"
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google"
import Script from "next/script"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { PageTransition } from "@/components/page-transition"
import ServiceWorkerRegistration from "@/components/service-worker-registration"
import PWAHandler from "@/components/pwa-handler"
import { AppShell } from "@/components/layout/app-shell"

const ibmSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400","500","600","700"], variable: "--font-ibm-sans" })
const ibmMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400","500"], variable: "--font-ibm-mono" })

export const metadata: Metadata = {
  title: "Banking Exam Preparation",
  description: "Comprehensive banking exam preparation platform",
  applicationName: "Quizzy",
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Quizzy',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
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
  themeColor: '#09090b',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192x192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/icons/icon-512x512.png" />
        {/* iOS home-screen icon: without this, Add to Home Screen snapshots the page. */}
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="theme-color" content="#09090b" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Quizzy" />
      </head>
      <body className={`${ibmSans.variable} ${ibmMono.variable} font-sans`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          themes={['dark', 'light']}
          disableTransitionOnChange
        >
          <PageTransition>
            <AppShell>
              {children}
            </AppShell>
          </PageTransition>
          <ServiceWorkerRegistration />
          <PWAHandler />
        </ThemeProvider>
        
        {/* Umami Analytics */}
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id="686ffdd5-ec09-41ac-9afe-19388b1fd2fb"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
