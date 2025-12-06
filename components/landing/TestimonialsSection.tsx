"use client";

import { motion } from "framer-motion";

const testimonials = [
    {
        name: "Priya Sharma",
        role: "SBI PO 2024",
        content: "Quizzy completely transformed how I prepared for my exams. The analytics helped me identify weak areas I didn't even know I had. Cleared on my first attempt!",
        avatar: "PS",
        gradient: "from-violet-500 to-purple-500",
    },
    {
        name: "Rajesh Kumar",
        role: "IBPS Clerk",
        content: "The mock tests are incredibly realistic. I felt like I was taking the actual exam. The detailed solutions helped me understand concepts I'd been struggling with for months.",
        avatar: "RK",
        gradient: "from-blue-500 to-cyan-500",
    },
    {
        name: "Anjali Gupta",
        role: "RBI Assistant",
        content: "What sets Quizzy apart is the personalized approach. The platform adapts to your learning pace and focuses on what matters most. Highly recommended!",
        avatar: "AG",
        gradient: "from-emerald-500 to-teal-500",
    },
];

export default function TestimonialsSection() {
    return (
        <section className="py-32 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 linear-bg opacity-30" />
            <div className="absolute top-1/2 right-0 w-72 h-72 bg-primary/5 rounded-full blur-[100px]" />

            <div className="container mx-auto px-4 relative z-10">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-20"
                >
                    <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
                        Testimonials
                    </p>
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6">
                        Loved by thousands
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Join the community of successful aspirants who trust Quizzy for their exam preparation.
                    </p>
                </motion.div>

                {/* Testimonials grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={testimonial.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="group"
                        >
                            <div className="relative p-8 rounded-2xl bg-card/50 border border-border/50 hover:border-primary/20 transition-all duration-500 card-hover backdrop-blur-sm h-full flex flex-col">
                                {/* Quote mark */}
                                <div className="text-6xl text-primary/20 font-serif leading-none mb-4">"</div>

                                {/* Content */}
                                <p className="text-muted-foreground leading-relaxed flex-1 mb-8">
                                    {testimonial.content}
                                </p>

                                {/* Author */}
                                <div className="flex items-center gap-4">
                                    <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${testimonial.gradient} flex items-center justify-center`}>
                                        <span className="text-sm font-semibold text-white">
                                            {testimonial.avatar}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">{testimonial.name}</p>
                                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
