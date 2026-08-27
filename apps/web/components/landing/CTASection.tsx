"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

export default function CTASection() {
  return (
    <section className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative rounded-[35px] md:rounded-[45px] bg-[#F3F3F3] dark:bg-[#1E1F2A] border-2 border-[#191A23] dark:border-white/30 shadow-[0px_6px_0px_0px_#191A23] dark:shadow-[0px_6px_0px_0px_#000] p-8 md:p-14 overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left: Headline, Subtitle, CTA */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground font-heading leading-tight">
                Let&apos;s make things happen
              </h2>
              <p className="text-base sm:text-lg text-muted-foreground font-medium leading-relaxed max-w-xl">
                Take your banking exam preparation to the next level. Experience structured mock tests, instant scoring, and actionable AI analytics today.
              </p>
              <div className="pt-2">
                <Link href="/auth/signup">
                  <Button
                    size="lg"
                    variant="positivusDark"
                    className="text-base font-bold gap-3"
                  >
                    Get your free trial <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right: Exact Figma CTA Illustration */}
            <div className="lg:col-span-5 flex justify-center items-center relative">
              <div className="relative w-full max-w-[380px]">
                <Image
                  src="/figma/cta-illustration.svg"
                  alt="Positivus CTA Graphic"
                  width={494}
                  height={395}
                  className="w-full h-auto object-contain select-none pointer-events-none"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
