"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function CTASection() {
    return (
        <section className="py-24 sm:py-32 relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-6">
                        Ready to start your journey?
                    </h2>
                    <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
                        Join thousands of successful candidates who cleared their banking exams with Quizzy. 
                        Start your free trial today.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/auth/login">
                            <Button 
                                size="lg"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-8 h-12 text-base font-medium glow-purple-sm"
                            >
                                Get Started Free
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/auth/login">
                            <Button 
                                variant="ghost"
                                size="lg"
                                className="text-muted-foreground hover:text-foreground rounded-lg px-8 h-12 text-base font-medium"
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
