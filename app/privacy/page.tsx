"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowLeft, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PrivacyPage() {
  return (
    <div className="space-y-6">

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-2xl bg-primary border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] mb-6">
            <Shield className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-4">
            Privacy{" "}
            <span className="relative inline-block">
              <span className="relative z-10">Policy</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-blue-400 -z-10 -rotate-1" />
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
                Introduction
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to Quizzy ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our quiz preparation platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-green-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">2</span>
                Information We Collect
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">We collect information that you provide directly to us, including:</p>
              <ul className="list-none space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span><strong>Account Information:</strong> Name, email address, and password when you register</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span><strong>Profile Data:</strong> Optional profile information such as profile picture and bio</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span><strong>Quiz Data:</strong> Your quiz attempts, scores, answers, and time spent</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span><strong>Usage Data:</strong> Information about how you interact with our platform</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-blue-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">3</span>
                How We Use Your Information
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">We use the information we collect to:</p>
              <ul className="list-none space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Provide, maintain, and improve our services</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Track your progress and provide personalized analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Send you updates, newsletters, and promotional materials (with your consent)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Respond to your comments, questions, and support requests</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-pink-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">4</span>
                Data Security
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-purple-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">5</span>
                Your Rights
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-none space-y-3 text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Access and receive a copy of your personal data</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Request correction of inaccurate data</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Request deletion of your personal data</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="h-6 w-6 rounded bg-primary/20 flex items-center justify-center text-primary mt-0.5">•</span>
                  <span>Opt-out of marketing communications</span>
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-3">
                <span className="h-8 w-8 rounded-lg bg-orange-400 border-2 border-foreground flex items-center justify-center text-sm font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">6</span>
                Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <div className="mt-4 p-4 bg-muted rounded-xl border-2 border-foreground">
                <p className="font-bold">Quizzy Support</p>
                <p className="text-muted-foreground">Email: privacy@quizzy.com</p>
                <p className="text-muted-foreground">Address: Bangalore, India</p>
              </div>
            </section>
        </div>
      </motion.div>
    </div>
  )
}
