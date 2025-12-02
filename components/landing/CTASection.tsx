"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"

export default function CTASection() {
  return (
    <section className="py-20 md:py-32 bg-primary relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      
      {/* Floating shapes */}
      <motion.div
        className="absolute top-10 left-10 h-20 w-20 rounded-full border-4 border-primary-foreground/30"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute bottom-10 right-10 h-32 w-32 rounded-2xl border-4 border-primary-foreground/20 rotate-45"
        animate={{ rotate: [45, 135, 45] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute top-1/2 right-1/4 h-16 w-16 rounded-lg border-4 border-primary-foreground/20"
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 text-primary-foreground">
            Ready to Start Your Journey to{" "}
            <span className="relative inline-block">
              <span className="relative z-10">Success?</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-yellow-400 -z-10 -rotate-1" />
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-primary-foreground/80 mb-10">
            Join thousands of successful candidates who cleared their banking exams with Quizzy. 
            Start your free trial today - no credit card required!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/login">
              <Button 
                size="lg" 
                className="text-lg px-8 py-6 bg-background text-foreground border-4 border-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] transition-all font-bold"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 bg-transparent text-primary-foreground border-4 border-primary-foreground shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)] hover:bg-primary-foreground/10 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] transition-all font-bold"
              >
                I Have an Account
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
