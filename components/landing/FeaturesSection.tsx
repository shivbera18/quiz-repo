"use client";

import {
    BookOpen as BookOpenIcon,
    Zap as LightningIcon,
    Brain as BrainIcon,
    Clock as ClockIcon,
    Trophy as MedalIcon,
    MessageCircle as ChatCenteredDotsIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import React from "react";
import Image from "next/image";

interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    delay?: number;
}

function FeatureCard({
    icon,
    title,
    description,
    delay = 0,
}: FeatureCardProps) {
    const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.7,
                delay: delay,
            },
        },
    };

    return (
        <motion.div
            className="group relative"
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
        >
            <div className="bg-card relative rounded-2xl border-4 border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] dark:border-white/60 dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.6)] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.7)]">
                <div className="relative z-10">
                    <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-md border-2 border-black bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:bg-black dark:border-white/60">
                        {icon}
                    </div>
                    <h3 className="text-foreground mb-3 text-xl font-bold">
                        {title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

const features = [
    {
        icon: <BookOpenIcon className="h-6 w-6" />,
        title: "Comprehensive Question Bank",
        description:
            "Access thousands of curated questions covering all banking exam topics with detailed explanations.",
    },
    {
        icon: <LightningIcon className="h-6 w-6" />,
        title: "Quick Mock Tests",
        description:
            "Practice with full-length mock tests that simulate real exam conditions and timing.",
    },
    {
        icon: <BrainIcon className="h-6 w-6" />,
        title: "Smart Analytics",
        description:
            "Track your performance with AI-powered insights to identify strengths and weaknesses.",
    },
    {
        icon: <ClockIcon className="h-6 w-6" />,
        title: "Timed Practice",
        description:
            "Improve your speed with time-bound quizzes and develop better exam strategies.",
    },
    {
        icon: <MedalIcon className="h-6 w-6" />,
        title: "Leaderboards",
        description:
            "Compete with thousands of aspirants and track your national ranking in real-time.",
    },
    {
        icon: <ChatCenteredDotsIcon className="h-6 w-6" />,
        title: "Sectional Tests",
        description:
            "Focus on specific topics with targeted chapter-wise and subject-wise tests.",
    },
];

const containerVariants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.2,
        },
    },
};

export default function Features() {
    return (
        <section className="relative overflow-hidden py-20 lg:py-32">
            <div className="absolute inset-0" />
            <div className="relative z-10 container mx-auto">
                <motion.div
                    className="mb-16 text-center md:mb-20"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.3 }}
                >
                    <h2 className="relative mx-auto mb-6 max-w-4xl text-center text-4xl leading-tight font-black tracking-tighter md:text-5xl lg:text-6xl">
                        Features of Quizzy
                        <Image
                            width={50}
                            height={50}
                            src="/doodles/quiz.svg"
                            alt="Quiz Icon"
                            className="absolute -top-16 left-0 size-16 md:-top-20 md:size-28 opacity-30"
                        />
                    </h2>
                    <p className="text-muted-foreground mx-auto max-w-3xl text-center text-lg leading-relaxed tracking-tight md:text-xl">
                        Everything you need to excel in banking exams, all in one place
                    </p>
                </motion.div>
                <motion.div
                    className="mx-4 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-12"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                >
                    {features.map((feature, index) => (
                        <FeatureCard
                            key={index}
                            icon={feature.icon}
                            title={feature.title}
                            description={feature.description}
                            delay={index * 0.1}
                        />
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
