"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

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
];

export default function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section id="faq" className="py-24 sm:py-32 relative">
            <div className="container mx-auto px-4">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <p className="text-sm font-medium text-primary mb-4">FAQ</p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4">
                        Frequently asked questions
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Got questions? We've got answers. If you can't find what you're looking for, feel free to contact us.
                    </p>
                </motion.div>

                {/* FAQ list */}
                <div className="max-w-2xl mx-auto space-y-2">
                    {faqs.map((faq, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.05 }}
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="w-full p-4 flex items-center justify-between text-left rounded-lg hover:bg-card/50 transition-colors"
                            >
                                <span className="font-medium text-foreground">{faq.question}</span>
                                <ChevronDown 
                                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                                        openIndex === index ? "rotate-180" : ""
                                    }`} 
                                />
                            </button>
                            
                            <AnimatePresence>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <p className="px-4 pb-4 text-muted-foreground text-sm leading-relaxed">
                                            {faq.answer}
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
