"use client";

import { motion } from "framer-motion";
import {
    QuestionBankIcon,
    MockTestIcon,
    AnalyticsIcon,
    TimerIcon,
    LeaderboardIcon,
    ProgressIcon,
} from "@/components/icons/FeatureIcons";

const features = [
    {
        icon: QuestionBankIcon,
        title: "Comprehensive Question Bank",
        description: "Access thousands of curated questions covering all banking exam topics with detailed explanations and solutions.",
        gradient: "from-violet-500/20 to-purple-500/20",
    },
    {
        icon: MockTestIcon,
        title: "Realistic Mock Tests",
        description: "Practice with full-length mock tests that simulate real exam conditions, timing, and difficulty levels.",
        gradient: "from-blue-500/20 to-cyan-500/20",
    },
    {
        icon: AnalyticsIcon,
        title: "Smart Analytics",
        description: "Track your performance with AI-powered insights that identify your strengths and areas for improvement.",
        gradient: "from-emerald-500/20 to-teal-500/20",
    },
    {
        icon: TimerIcon,
        title: "Timed Practice",
        description: "Improve your speed and accuracy with time-bound quizzes designed to build exam-ready confidence.",
        gradient: "from-orange-500/20 to-amber-500/20",
    },
    {
        icon: LeaderboardIcon,
        title: "Live Leaderboards",
        description: "Compete with thousands of aspirants nationwide and track your ranking in real-time.",
        gradient: "from-pink-500/20 to-rose-500/20",
    },
    {
        icon: ProgressIcon,
        title: "Progress Tracking",
        description: "Monitor your improvement over time with detailed metrics, trends, and personalized recommendations.",
        gradient: "from-indigo-500/20 to-violet-500/20",
    },
];

export default function FeaturesSection() {
    return (
        <section id="features" className="py-32 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute inset-0 linear-bg opacity-50" />
            <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/5 rounded-full blur-[120px]" />

            <div className="container mx-auto px-4 relative z-10">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <motion.p 
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-sm font-medium text-primary mb-4 tracking-wide uppercase"
                    >
                        Features
                    </motion.p>
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6">
                        Everything you need
                        <br />
                        <span className="text-muted-foreground">to succeed</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        A complete toolkit designed to help you prepare efficiently and ace your banking exams with confidence.
                    </p>
                </motion.div>

                {/* Features grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="group relative"
                        >
                            <div className="relative p-8 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/30 transition-all duration-500 card-hover backdrop-blur-sm h-full">
                                {/* Icon with gradient background */}
                                <div className={`h-14 w-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                                    <feature.icon className="h-7 w-7 text-foreground" />
                                </div>
                                
                                <h3 className="text-xl font-medium mb-3 text-foreground">
                                    {feature.title}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>

                                {/* Hover gradient overlay */}
                                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
