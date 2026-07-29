"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { ArrowRight } from "lucide-react"
import Science from "../svgs/Science"
import Cap from "../svgs/Cap"
import Atom from "../svgs/Atom"
import Trophy from "../svgs/Trophy"
import Calculator from "../svgs/Calculator"
import Book from "../svgs/Book"

export default function CTASection() {
  return (
    <section className="py-20 md:py-32 bg-background relative overflow-hidden">
      {/* Decorative SVG Elements */}
      <Science className="absolute top-4 left-4 size-24 md:size-48 text-foreground opacity-10" />
      <Cap className="absolute right-10 bottom-10 size-24 md:size-48 text-foreground opacity-10" />
      <Trophy className="absolute bottom-32 left-16 size-20 md:size-40 text-foreground opacity-10 hidden lg:block" />
      <Calculator className="absolute top-40 right-1/4 size-16 md:size-28 text-foreground opacity-10 hidden lg:block" />
      
      {/* Floating shapes */}
      <motion.div
        className="absolute top-10 left-10 h-20 w-20 rounded-full border-4 border-foreground/20"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute bottom-10 right-10 h-32 w-32 rounded-2xl border-4 border-foreground/15 rotate-45"
        animate={{ rotate: [45, 135, 45] }}
        transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute top-1/2 right-1/4 h-16 w-16 rounded-lg border-4 border-foreground/15"
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
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-6 text-foreground">
            Ready to Start Your Journey to{" "}
            <span className="relative inline-block">
              <span className="relative z-10">Success?</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-yellow-400 -z-10 -rotate-1" />
            </span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground mb-10">
            Join thousands of successful candidates who cleared their banking exams with Quizzy. 
            Start your free trial today - no credit card required!
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/login">
              <Button 
                size="lg" 
                variant="neobrutalist"
                className="text-lg px-8 py-6 font-bold"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-6 font-bold border-4 border-foreground bg-background text-foreground shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
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
