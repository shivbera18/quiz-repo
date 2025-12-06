"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, HelpCircle } from "lucide-react"
import Book from "../svgs/Book"
import Atom from "../svgs/Atom"
import Science from "../svgs/Science"
import Calculator from "../svgs/Calculator"

const faqs = [
  {
    question: "What banking exams does Quizzy cover?",
    answer: "Quizzy covers all major banking exams including IBPS PO, IBPS Clerk, SBI PO, SBI Clerk, RBI Grade B, RBI Assistant, NABARD, SIDBI, and more. Our question bank is regularly updated to match the latest exam patterns.",
  },
  {
    question: "How are the mock tests similar to actual exams?",
    answer: "Our mock tests replicate the exact pattern, difficulty level, and time constraints of actual banking exams. We analyze previous years' papers and current trends to ensure our tests provide the most realistic practice experience.",
  },
  {
    question: "Can I access Quizzy on mobile devices?",
    answer: "Yes! Quizzy is fully responsive and works seamlessly on all devices - smartphones, tablets, and desktops. You can practice anytime, anywhere without compromising on features or experience.",
  },
  {
    question: "How does the analytics feature help me?",
    answer: "Our analytics dashboard provides detailed insights into your performance - subject-wise scores, time taken per question, accuracy trends, and comparison with toppers. This helps you identify weak areas and focus your preparation effectively.",
  },
  {
    question: "Is there a free trial available?",
    answer: "Absolutely! Our Free plan gives you access to 50 practice questions per day, basic analytics, and 2 mock tests per month - forever free. This allows you to experience the platform before upgrading to a paid plan.",
  },
  {
    question: "Can I switch between plans?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. If you upgrade, you'll be charged the prorated amount. If you downgrade, the change will take effect from your next billing cycle.",
  },
  {
    question: "Do you provide solutions for wrong answers?",
    answer: "Yes! Every question comes with a detailed explanation, including the concept used, step-by-step solution, and tips to solve similar questions faster. This helps you learn from your mistakes.",
  },
  {
    question: "How often is the question bank updated?",
    answer: "We add new questions weekly and update our question bank based on the latest exam patterns. Our team of subject experts ensures all questions are accurate, relevant, and aligned with current exam trends.",
  },
]

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <section id="faq" className="py-20 md:py-32 relative overflow-hidden">
      {/* Decorative SVG Elements */}
      <Book className="absolute top-10 left-10 size-24 md:size-40 text-foreground opacity-10" />
      <Atom className="absolute bottom-20 right-10 size-24 md:size-40 text-foreground opacity-10" />
      <Science className="absolute top-1/2 right-20 size-16 md:size-28 text-foreground opacity-10 hidden lg:block" />
      <Calculator className="absolute bottom-1/3 left-20 size-20 md:size-32 text-foreground opacity-10 hidden lg:block" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-primary/10 border-2 border-primary rounded-full text-sm font-bold text-primary mb-4">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
            Frequently Asked{" "}
            <span className="relative inline-block">
              <span className="relative z-10">Questions</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-blue-400 -z-10 -rotate-1" />
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Got questions? We've got answers. If you can't find what you're looking for, feel free to contact us.
          </p>
        </motion.div>

        {/* FAQ List */}
        <div className="max-w-3xl mx-auto space-y-4">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <div 
                className={`bg-card border-4 border-foreground rounded-2xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] transition-all ${openIndex === index ? 'shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_rgba(255,255,255,0.2)]' : ''}`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-bold text-lg">{faq.question}</span>
                  <ChevronDown className={`h-6 w-6 transition-transform flex-shrink-0 ${openIndex === index ? 'rotate-180' : ''}`} />
                </button>
                
                <AnimatePresence>
                  {openIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="px-6 pb-5 pt-0">
                        <div className="text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
