"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
    return (
        <section className="py-32 relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-t from-primary/20 via-primary/5 to-transparent" />
                <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[150px] animate-pulse-glow" />
                <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-violet-500/20 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
            </div>

            {/* Grid pattern */}
            <div className="absolute inset-0 grid-pattern opacity-50" />

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-8">
                        Ready to start your
                        <br />
                        <span className="text-gradient">journey to success?</span>
                    </h2>
                    <p className="text-lg text-muted-foreground mb-12 max-w-xl mx-auto">
                        Join thousands of successful candidates who cleared their banking exams with Quizzy. 
                        Start your free trial today.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/login">
                            <Button 
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 h-14 text-base font-medium glow-sm group"
                            >
                                Get Started Free
                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>
                        <Link href="/auth/login">
                            <Button 
                                variant="ghost"
                                size="lg"
                                className="text-muted-foreground hover:text-foreground rounded-xl px-8 h-14 text-base font-medium border border-border/50 hover:border-border hover:bg-secondary/50"
                            >
                                I have an account
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </section>
    );
}
