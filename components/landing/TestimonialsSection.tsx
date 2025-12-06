"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
    {
        name: "Priya Sharma",
        role: "SBI PO 2024",
        content: "Quizzy transformed my preparation. The mock tests are exactly like the real exam and the analytics helped me improve significantly.",
        rating: 5,
    },
    {
        name: "Rajesh Kumar",
        role: "IBPS Clerk",
        content: "The question bank is comprehensive and the detailed solutions helped me understand concepts better. Best platform for banking exams!",
        rating: 5,
    },
    {
        name: "Anjali Gupta",
        role: "RBI Assistant",
        content: "I love the sectional tests feature. It helped me focus on my weak areas and improve systematically. Highly recommended!",
        rating: 5,
    },
];

export default function TestimonialsSection() {
    return (
        <section className="py-24 sm:py-32 relative">
            {/* Background gradient */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/2 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
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
                    <p className="text-sm font-medium text-primary mb-4">Testimonials</p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4">
                        Loved by thousands
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Join the community of successful aspirants who trust Quizzy for their exam preparation.
                    </p>
                </motion.div>

                {/* Testimonials grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="p-6 rounded-xl bg-card/50 border border-border/50"
                        >
                            {/* Rating */}
                            <div className="flex gap-1 mb-4">
                                {Array.from({ length: testimonial.rating }).map((_, i) => (
                                    <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                                ))}
                            </div>

                            {/* Content */}
                            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                                "{testimonial.content}"
                            </p>

                            {/* Author */}
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                    <span className="text-sm font-medium text-primary">
                                        {testimonial.name.split(' ').map(n => n[0]).join('')}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{testimonial.name}</p>
                                    <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
