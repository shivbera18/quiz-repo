"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SparkleIcon } from "@/components/icons/FeatureIcons";

export default function HeroSection() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (token && user) {
            setIsLoggedIn(true);
        }
        setIsLoading(false);
    }, []);

    const handleDashboardClick = () => {
        const user = localStorage.getItem("user");
        if (user) {
            try {
                const userData = JSON.parse(user);
                router.push(userData.isAdmin ? "/admin" : "/dashboard");
            } catch {
                router.push("/auth/login");
            }
        } else {
            router.push("/auth/login");
        }
    };

    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden linear-bg">
            {/* Grid pattern */}
            <div className="absolute inset-0 grid-pattern" />
            
            {/* Floating orbs */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[100px] animate-pulse-glow" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
            <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-violet-500/10 rounded-full blur-[80px] animate-float" />

            <div className="container mx-auto px-4 relative z-10 pt-20">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    className="max-w-4xl mx-auto text-center"
                >
                    {/* Badge */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 backdrop-blur-sm"
                    >
                        <SparkleIcon className="h-4 w-4 text-primary" />
                        <span className="text-sm text-primary font-medium">AI-powered exam preparation</span>
                    </motion.div>

                    {/* Main heading */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-semibold tracking-tight mb-8 leading-[1.1]"
                    >
                        <span className="text-foreground">Master your</span>
                        <br />
                        <span className="text-gradient glow-text">banking exams</span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed"
                    >
                        The intelligent quiz platform that adapts to your learning style. 
                        Practice smarter with real-time analytics and personalized insights.
                    </motion.p>

                    {/* CTA Buttons */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        {!isLoading && (
                            <>
                                {isLoggedIn ? (
                                    <Button
                                        onClick={handleDashboardClick}
                                        size="lg"
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 h-14 text-base font-medium glow-sm group"
                                    >
                                        Go to Dashboard
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                ) : (
                                    <>
                                        <Link href="/auth/login">
                                            <Button
                                                size="lg"
                                                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-8 h-14 text-base font-medium glow-sm group"
                                            >
                                                Start for free
                                                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </Link>
                                        <Link href="#features">
                                            <Button
                                                variant="ghost"
                                                size="lg"
                                                className="text-muted-foreground hover:text-foreground rounded-xl px-8 h-14 text-base font-medium border border-border/50 hover:border-border hover:bg-secondary/50"
                                            >
                                                See how it works
                                            </Button>
                                        </Link>
                                    </>
                                )}
                            </>
                        )}
                    </motion.div>

                    {/* Stats */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="flex items-center justify-center gap-12 sm:gap-16 mt-20"
                    >
                        {[
                            { value: "10K+", label: "Active learners" },
                            { value: "50K+", label: "Questions" },
                            { value: "95%", label: "Success rate" },
                        ].map((stat, index) => (
                            <div key={index} className="text-center">
                                <div className="text-3xl sm:text-4xl font-semibold text-foreground mb-1">{stat.value}</div>
                                <div className="text-sm text-muted-foreground">{stat.label}</div>
                            </div>
                        ))}
                    </motion.div>
                </motion.div>
            </div>

            {/* Bottom gradient fade */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </section>
    );
}
