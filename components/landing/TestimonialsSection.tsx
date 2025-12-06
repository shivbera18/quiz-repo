"use client";

import React from "react";
import { motion } from "framer-motion";
import { Star as StarIcon, Quote as QuotesIcon } from "lucide-react";
import Image from "next/image";
import Cap from "../svgs/Cap";
import Book from "../svgs/Book";
import Trophy from "../svgs/Trophy";
import Atom from "../svgs/Atom";

interface TestimonialCardProps {
    name: string;
    role: string;
    image: string;
    content: string;
    rating: number;
    delay?: number;
}

function TestimonialCard({
    name,
    role,
    image,
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
            <div className="relative rounded-md border-4 border-black bg-card p-8 shadow-[8px_8px_0px_0px_#000] transition-all duration-300 hover:translate-x-[-4px] hover:translate-y-[-4px] hover:shadow-[12px_12px_0px_0px_#000] dark:border-white/65 dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.65)] dark:hover:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.75)]">
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
                        <div className="relative h-12 w-12 rounded-md border-4 border-black dark:border-white/65 overflow-hidden">
                            <Image
                                src={image}
                                alt={name}
                                fill
                                className="object-cover"
                            />
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
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces",
        content:
            "Quizzy transformed my preparation. The mock tests are exactly like the real exam and the analytics helped me improve significantly.",
        rating: 5,
    },
    {
        name: "Rajesh Kumar",
        role: "IBPS Clerk",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces",
        content:
            "The question bank is comprehensive and the detailed solutions helped me understand concepts better. Best platform for banking exams!",
        rating: 5,
    },
    {
        name: "Anjali Gupta",
        role: "RBI Assistant",
        image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces",
        content:
            "I love the sectional tests feature. It helped me focus on my weak areas and improve systematically. Highly recommended!",
        rating: 5,
    },
    {
        name: "Vikram Singh",
        role: "RRB PO",
        image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces",
        content:
            "The leaderboard feature kept me motivated throughout my preparation. Competing with others pushed me to perform better.",
        rating: 5,
    },
    {
        name: "Sneha Patel",
        role: "LIC AAO",
        image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces",
        content:
            "Clean interface, great questions, excellent analytics. Everything you need for banking exam preparation in one place.",
        rating: 5,
    },
    {
        name: "Arun Mehta",
        role: "NABARD Grade A",
        image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces",
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
            {/* Decorative SVG Elements */}
            <Cap className="absolute top-10 right-10 size-24 md:size-40 text-foreground opacity-10" />
            <Book className="absolute bottom-20 left-10 size-24 md:size-40 text-foreground opacity-10" />
            <Trophy className="absolute top-1/2 left-20 size-16 md:size-28 text-foreground opacity-10 hidden lg:block" />
            <Atom className="absolute bottom-1/3 right-20 size-20 md:size-32 text-foreground opacity-10 hidden lg:block" />

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
                            image={testimonial.image}
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
