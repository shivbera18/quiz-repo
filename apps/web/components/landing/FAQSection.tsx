"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, HelpCircle } from "lucide-react"
import Book from "../svgs/Book"
import Atom from "../svgs/Atom"
import Science from "../svgs/Science"
import Calculator from "../svgs/Calculator"

const steps = [
  {
    number: "01",
    title: "Diagnostic & Skill Assessment",
    description: "Start with a 15-minute diagnostic test across Reasoning, Quantitative Aptitude, and English to pinpoint your strengths and identify high-yield improvement areas.",
  },
  {
    number: "02",
    title: "Topic-Wise Sectional Drills",
    description: "Practice targeted sectional drills with timer constraints to build problem-solving muscle memory and reduce average time per question.",
  },
  {
    number: "03",
    title: "AI Question Generation & Flashcards",
    description: "Generate customized practice sets and 2-digit/3-digit arithmetic flashcards on demand using our built-in AI tools to master quick calculations.",
  },
  {
    number: "04",
    title: "Full-Length Exam Simulations",
    description: "Take timed, full-pattern mock exams replicating the exact difficulty and marking schemes of SBI, IBPS, and RBI examinations.",
  },
  {
    number: "05",
    title: "Real-Time Ranking & Leaderboards",
    description: "Benchmark your score and completion speed against thousands of other candidates on national weekly leaderboards with speed-based tie breakers.",
  },
  {
    number: "06",
    title: "Event-Driven Analytics & Review",
    description: "Review detailed question-by-question explanations, time spent per section, and 90-day activity streaks to maintain daily exam readiness.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="process" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        {/* Positivus Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 mb-16">
          <div className="px-3 py-1 bg-[#B9FF66] text-[#191A23] text-2xl sm:text-3xl md:text-4xl font-bold rounded-[7px] border-2 border-[#191A23] font-heading shrink-0 shadow-[2px_2px_0px_0px_#191A23]">
            Our Working Process
          </div>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl font-medium leading-relaxed">
            Step-by-Step Guide to Achieving Your Target Banking Exam Percentile and Selection.
          </p>
        </div>

        {/* Numbered Process Accordion */}
        <div className="space-y-6 max-w-4xl mx-auto">
          {steps.map((step, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={step.number}
                className={`rounded-[35px] md:rounded-[45px] border-2 border-[#191A23] dark:border-white/30 transition-all duration-300 shadow-[0px_5px_0px_0px_#191A23] dark:shadow-[0px_5px_0px_0px_#000] overflow-hidden ${
                  isOpen
                    ? "bg-[#B9FF66] text-[#191A23]"
                    : "bg-[#F3F3F3] dark:bg-[#1E1F2A] text-foreground hover:bg-[#eaeaea] dark:hover:bg-[#252736]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleItem(idx)}
                  className="w-full p-6 sm:p-8 md:p-10 flex items-center justify-between text-left gap-4 cursor-pointer"
                >
                  <div className="flex items-center gap-4 sm:gap-6 md:gap-8 min-w-0">
                    <span className="text-3xl sm:text-4xl md:text-5xl font-black font-heading shrink-0">
                      {step.number}
                    </span>
                    <span className="text-lg sm:text-xl md:text-2xl font-bold font-heading truncate">
                      {step.title}
                    </span>
                  </div>

                  <div
                    className={`h-11 w-11 md:h-14 md:w-14 rounded-full border-2 border-[#191A23] flex items-center justify-center font-bold text-xl md:text-2xl shrink-0 transition-transform ${
                      isOpen ? "bg-white text-[#191A23] rotate-180" : "bg-[#F3F3F3] dark:bg-[#1E1F2A] text-[#191A23] dark:text-white"
                    }`}
                  >
                    {isOpen ? "−" : "+"}
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                    >
                      <div className="px-6 sm:px-8 md:px-10 pb-8 md:pb-10 pt-2 border-t-2 border-[#191A23]/20">
                        <p className="text-base md:text-lg font-medium text-[#191A23] leading-relaxed">
                          {step.description}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
