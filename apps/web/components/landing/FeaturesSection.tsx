"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowUpRight, Zap, Target, Brain, Award, BarChart3, Clock } from "lucide-react";

interface ServiceCard {
  id: string;
  titleLine1: string;
  titleLine2: string;
  theme: "grey" | "green" | "dark";
  icon: typeof Zap;
  href: string;
  description: string;
}

const services: ServiceCard[] = [
  {
    id: "sectional",
    titleLine1: "Sectional Speed",
    titleLine2: "Drills & Practice",
    theme: "grey",
    icon: Target,
    href: "/dashboard/sectional-tests",
    description: "Topic-wise speed tests covering Quantitative Aptitude, Reasoning Ability, and English Language with instant scoring.",
  },
  {
    id: "mocks",
    titleLine1: "Full-Length Mock",
    titleLine2: "Exam Simulations",
    theme: "green",
    icon: Zap,
    href: "/dashboard/full-mock-tests",
    description: "Exact pattern mock tests for SBI PO, IBPS Clerk, and RBI Grade B with negative marking and sectional time limits.",
  },
  {
    id: "ai-gen",
    titleLine1: "AI Question &",
    titleLine2: "Flashcard Generator",
    theme: "dark",
    icon: Brain,
    href: "/dashboard/flash-cards",
    description: "Generate targeted practice flashcards and exam-style questions on demand using advanced AI models.",
  },
  {
    id: "leaderboards",
    titleLine1: "Real-time Weekly",
    titleLine2: "Leaderboards & Ranks",
    theme: "green",
    icon: Award,
    href: "/dashboard",
    description: "Compete on national leaderboards with speed tie-breaking scores and ISO-week rotation tracking.",
  },
  {
    id: "analytics",
    titleLine1: "Event-Driven Analytics",
    titleLine2: "& Streak Tracking",
    theme: "dark",
    icon: BarChart3,
    href: "/analytics",
    description: "Comprehensive rolling performance indicators, accuracy breakdowns, and 90-day activity calendars.",
  },
  {
    id: "scheduled",
    titleLine1: "Scheduled Exam",
    titleLine2: "Window Enforcement",
    theme: "grey",
    icon: Clock,
    href: "/dashboard",
    description: "Timed testing windows with server-authoritative clock gates and automated snapshot scoring.",
  },
];

export default function FeaturesSection() {
  return (
    <section id="services" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        {/* Positivus Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 mb-16">
          <div className="px-3 py-1 bg-[#B9FF66] text-[#191A23] text-2xl sm:text-3xl md:text-4xl font-bold rounded-[7px] border-2 border-[#191A23] font-heading shrink-0 shadow-[2px_2px_0px_0px_#191A23]">
            Services
          </div>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl font-medium leading-relaxed">
            At our core, we provide a complete suite of banking exam preparation tools designed to help students maximize their percentile and study efficiency.
          </p>
        </div>

        {/* 6-Card Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {services.map((service, idx) => {
            const Icon = service.icon;

            // Style mapping for Positivus 3-theme cards
            const cardStyles = {
              grey: {
                cardBg: "bg-[#F3F3F3] dark:bg-[#1E1F2A] border-[#191A23] dark:border-white/30 text-[#191A23] dark:text-white",
                badgeBg: "bg-[#B9FF66] text-[#191A23]",
                badge2Bg: "bg-[#B9FF66] text-[#191A23]",
                arrowCircle: "bg-[#191A23] text-[#B9FF66] group-hover:bg-[#B9FF66] group-hover:text-[#191A23]",
                linkText: "text-[#191A23] dark:text-white",
              },
              green: {
                cardBg: "bg-[#B9FF66] border-[#191A23] text-[#191A23]",
                badgeBg: "bg-white text-[#191A23]",
                badge2Bg: "bg-white text-[#191A23]",
                arrowCircle: "bg-[#191A23] text-[#B9FF66] group-hover:bg-white group-hover:text-[#191A23]",
                linkText: "text-[#191A23]",
              },
              dark: {
                cardBg: "bg-[#191A23] border-[#191A23] dark:border-white/30 text-white",
                badgeBg: "bg-white text-[#191A23]",
                badge2Bg: "bg-[#B9FF66] text-[#191A23]",
                arrowCircle: "bg-white text-[#191A23] group-hover:bg-[#B9FF66] group-hover:text-[#191A23]",
                linkText: "text-white",
              },
            }[service.theme];

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`group relative rounded-[35px] md:rounded-[45px] p-8 md:p-12 border-2 shadow-[0px_6px_0px_0px_#191A23] dark:shadow-[0px_6px_0px_0px_#000] flex flex-col justify-between min-h-[310px] transition-all hover:translate-y-[-3px] hover:shadow-[0px_9px_0px_0px_#191A23] ${cardStyles.cardBg}`}
              >
                {/* Top: Title with Pill Badges */}
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className={`inline-block px-2.5 py-1 text-xl md:text-2xl font-bold rounded-[7px] border border-[#191A23] font-heading leading-none ${cardStyles.badgeBg}`}>
                      {service.titleLine1}
                    </span>
                    <br />
                    <span className={`inline-block px-2.5 py-1 text-xl md:text-2xl font-bold rounded-[7px] border border-[#191A23] font-heading leading-none ${cardStyles.badge2Bg}`}>
                      {service.titleLine2}
                    </span>
                  </div>

                  {/* Icon illustration container */}
                  <div className="h-16 w-16 md:h-20 md:w-20 rounded-2xl border-2 border-[#191A23]/30 flex items-center justify-center bg-black/5 dark:bg-white/5 shrink-0">
                    <Icon className="h-8 w-8 md:h-10 md:w-10 opacity-85" />
                  </div>
                </div>

                <p className="text-sm md:text-base font-normal opacity-90 my-4 leading-relaxed">
                  {service.description}
                </p>

                {/* Bottom: Learn more link with arrow */}
                <div className="pt-2">
                  <Link href={service.href} className="inline-flex items-center gap-3 font-semibold text-base md:text-lg group/link">
                    <div className={`h-10 w-10 md:h-11 md:w-11 rounded-full border border-[#191A23] flex items-center justify-center transition-all ${cardStyles.arrowCircle}`}>
                      <ArrowUpRight className="h-5 w-5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:translate-y-[-0.5px]" />
                    </div>
                    <span className={`hidden sm:inline font-medium hover:underline underline-offset-4 ${cardStyles.linkText}`}>
                      Explore {service.titleLine1}
                    </span>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
