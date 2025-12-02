"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, FileText, BookOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b-4 border-foreground dark:border-foreground/30">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-10 w-10 rounded-xl bg-primary border-2 border-foreground flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] group-hover:translate-x-[2px] group-hover:translate-y-[2px] group-hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:group-hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)] transition-all">
                <BookOpen className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-black tracking-tight">Quizzy</span>
            </Link>
            <ThemeToggle />
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Button */}
        <Link href="/">
          <Button variant="outline" className="mb-8 border-2 border-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-bold">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-primary border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] mb-6">
            <FileText className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Terms &{" "}
            <span className="relative inline-block">
              <span className="relative z-10">Conditions</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-green-400 -z-10 -rotate-1" />
            </span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-4xl mx-auto"
        >
          <div className="bg-card border-4 border-foreground rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] p-8 md:p-12 space-y-8">
            
            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-yellow-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">1</span>
                Acceptance of Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using Quizzy ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-green-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">2</span>
                User Accounts
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">When you create an account with us, you must:</p>
              <ul className="list-none space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Provide accurate, current, and complete information</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Maintain and promptly update your account information</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Maintain the security of your password and account</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Be at least 13 years of age to use the Service</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-blue-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">3</span>
                Acceptable Use
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You agree NOT to:</p>
              <ul className="list-none space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-destructive/20 flex items-center justify-center text-destructive mt-0.5">✕</span>
                  <span>Use the Service for any illegal purpose or in violation of any laws</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-destructive/20 flex items-center justify-center text-destructive mt-0.5">✕</span>
                  <span>Share your account credentials with others</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-destructive/20 flex items-center justify-center text-destructive mt-0.5">✕</span>
                  <span>Attempt to access other users' accounts or data</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-destructive/20 flex items-center justify-center text-destructive mt-0.5">✕</span>
                  <span>Copy, distribute, or sell our quiz content without permission</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-destructive/20 flex items-center justify-center text-destructive mt-0.5">✕</span>
                  <span>Use automated systems or bots to access the Service</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-pink-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">4</span>
                Intellectual Property
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                All content on Quizzy, including but not limited to questions, explanations, graphics, logos, and software, is the property of Quizzy and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works from our content without explicit written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-purple-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">5</span>
                Subscriptions and Payments
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">For paid subscriptions:</p>
              <ul className="list-none space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Subscriptions are billed on a recurring basis until cancelled</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>You can cancel your subscription at any time from your account settings</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Refunds are available within 7 days of purchase for first-time subscribers</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Prices may change with 30 days notice to existing subscribers</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-cyan-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">6</span>
                Disclaimer of Warranties
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is provided "as is" without any warranties, express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free. While we strive to provide accurate content, we make no guarantees about the accuracy or completeness of quiz questions or their alignment with actual exam patterns.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-red-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">7</span>
                Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                To the fullest extent permitted by law, Quizzy shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or goodwill, resulting from your use of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-orange-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">8</span>
                Changes to Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. We will notify users of significant changes via email or through the Service. Your continued use of the Service after changes become effective constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-indigo-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">9</span>
                Contact Information
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                For any questions regarding these Terms & Conditions, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-xl border-2 border-foreground">
                <p className="font-bold">Quizzy Legal Team</p>
                <p className="text-muted-foreground">Email: legal@quizzy.com</p>
                <p className="text-muted-foreground">Address: Bangalore, India</p>
              </div>
            </section>
          </div>
        </motion.div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-yellow-400 border-t-4 border-foreground w-full">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-foreground/70 text-sm font-medium">
              © {new Date().getFullYear()} Quizzy. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/terms" className="text-foreground hover:text-foreground text-sm font-black">
                Terms of Service
              </Link>
              <Link href="/privacy" className="text-foreground/70 hover:text-foreground text-sm font-bold transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
