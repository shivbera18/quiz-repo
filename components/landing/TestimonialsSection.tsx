"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star as StarIcon, Quote as QuotesIcon } from "lucide-react";

interface TestimonialCardProps {
    name: string;
    role: string;
    initial: string;
    content: string;
    rating: number;
    delay?: number;
}

function TestimonialCard({
    name,
    role,
    initial,
    content,
    rating,
    delay = 0,
}: TestimonialCardProps) {
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
            <div className="relative rounded-md border-4 border-black bg-card p-8 shadow-[8px_8px_0px_0px_#000] transition-all duration-300 hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] dark:border-white/20 dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.3)] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.4)]">
                <div className="relative z-10">
                    {/* Quote Icon */}
                    <div className="mb-4">
                        <QuotesIcon
                            className="h-8 w-8 text-foreground opacity-30"
                        />
                    </div>

                    {/* Rating */}
                    <div className="mb-4 flex gap-1">
                        {Array.from({ length: 5 }).map((_, index) => (
                            <StarIcon
                                key={index}
                                className={`h-4 w-4 ${index < rating
                                        ? "text-yellow-500 fill-yellow-500"
                                        : "text-gray-400 dark:text-gray-600"
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Content */}
                    <p className="mb-6 leading-relaxed font-medium text-foreground">
                        &quot;{content}&quot;
                    </p>

                    {/* Author */}
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-md border-4 border-black dark:border-white bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                            {initial}
                        </div>
                        <div>
                            <h4 className="font-bold text-foreground">
                                {name}
                            </h4>
                            <p className="text-sm font-medium text-muted-foreground">
                                {role}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

const testimonials = [
    {
        name: "Priya Sharma",
        role: "SBI PO 2024",
        initial: "P",
        content:
            "Quizzy transformed my preparation. The mock tests are exactly like the real exam and the analytics helped me improve significantly.",
        rating: 5,
    },
    {
        name: "Rajesh Kumar",
        role: "IBPS Clerk",
        initial: "R",
        content:
            "The question bank is comprehensive and the detailed solutions helped me understand concepts better. Best platform for banking exams!",
        rating: 5,
    },
    {
        name: "Anjali Gupta",
        role: "RBI Assistant",
        initial: "A",
        content:
            "I love the sectional tests feature. It helped me focus on my weak areas and improve systematically. Highly recommended!",
        rating: 5,
    },
    {
        name: "Vikram Singh",
        role: "RRB PO",
        initial: "V",
        content:
            "The leaderboard feature kept me motivated throughout my preparation. Competing with others pushed me to perform better.",
        rating: 5,
    },
    {
        name: "Sneha Patel",
        role: "LIC AAO",
        initial: "S",
        content:
            "Clean interface, great questions, excellent analytics. Everything you need for banking exam preparation in one place.",
        rating: 5,
    },
    {
        name: "Arun Mehta",
        role: "NABARD Grade A",
        initial: "A",
        content:
            "The timed practice sessions improved my speed dramatically. I can now attempt more questions in less time with better accuracy.",
        rating: 5,
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

const titleVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: 0.8,
        },
    },
};

export default function Testimonial() {
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
                    <motion.h2
                        className="mx-auto mb-6 max-w-4xl text-center text-4xl leading-tight font-black tracking-tighter md:text-5xl lg:text-6xl"
                        variants={titleVariants}
                    >
                        What Students Say
                    </motion.h2>
                    <motion.p
                        className="text-muted-foreground mx-auto max-w-3xl text-center text-lg leading-relaxed tracking-tight md:text-xl"
                        variants={titleVariants}
                    >
                        Join thousands of students who have aced their banking exams with Quizzy
                    </motion.p>
                </motion.div>

                <motion.div
                    className="mx-4 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-12"
                    variants={containerVariants}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                >
                    {testimonials.map((testimonial, index) => (
                        <TestimonialCard
                            key={index}
                            name={testimonial.name}
                            role={testimonial.role}
                            initial={testimonial.initial}
                            content={testimonial.content}
                            rating={testimonial.rating}
                            delay={index * 0.1}
                        />
                    ))}
                </motion.div>
            </div>
        </section>
    );
}
