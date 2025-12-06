"use client";

import { motion } from "framer-motion";
import {
    BookOpen,
    Zap,
    Brain,
    Clock,
    Trophy,
    BarChart3,
} from "lucide-react";

const features = [
    {
        icon: BookOpen,
        title: "Comprehensive Question Bank",
        description: "Access thousands of curated questions covering all banking exam topics with detailed explanations.",
    },
    {
        icon: Zap,
        title: "Quick Mock Tests",
        description: "Practice with full-length mock tests that simulate real exam conditions and timing.",
    },
    {
        icon: Brain,
        title: "Smart Analytics",
        description: "Track your performance with AI-powered insights to identify strengths and weaknesses.",
    },
    {
        icon: Clock,
        title: "Timed Practice",
        description: "Improve your speed with time-bound quizzes and develop better exam strategies.",
    },
    {
        icon: Trophy,
        title: "Leaderboards",
        description: "Compete with thousands of aspirants and track your national ranking in real-time.",
    },
    {
        icon: BarChart3,
        title: "Progress Tracking",
        description: "Monitor your improvement over time with detailed performance metrics and trends.",
    },
];

export default function FeaturesSection() {
    return (
        <section id="features" className="py-24 sm:py-32 relative">
            {/* Background gradient */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto px-4 relative z-10">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <p className="text-sm font-medium text-primary mb-4">Features</p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4">
                        Everything you need to succeed
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        A complete toolkit designed to help you prepare efficiently and ace your banking exams.
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
                            className="group relative p-6 rounded-xl bg-card/50 border border-border/50 hover:border-primary/30 hover:bg-card transition-all duration-300"
                        >
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                                <feature.icon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="text-lg font-medium mb-2 text-foreground">
                                {feature.title}
                            </h3>
                            <p className="text-muted-foreground text-sm leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
