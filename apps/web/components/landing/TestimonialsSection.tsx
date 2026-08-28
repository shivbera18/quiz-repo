"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
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


export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 md:py-28 bg-background scroll-mt-28">
      <div className="container mx-auto px-4 md:px-12">
        {/* Positivus Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 mb-16">
          <div className="px-3 py-1 bg-[#B9FF66] text-[#191A23] text-2xl sm:text-3xl md:text-4xl font-bold rounded-[7px] border-2 border-[#191A23] font-heading shrink-0 shadow-[2px_2px_0px_0px_#191A23]">
            Testimonials
          </div>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl font-medium leading-relaxed">
            Hear from our students: Read through our success stories to see how Quizzy helped them crack their banking exams.
          </p>
        </div>

        {/* Positivus Dark Testimonials Carousel Container */}
        <div className="bg-[#191A23] text-white rounded-[35px] md:rounded-[45px] p-8 sm:p-12 md:p-16 border-2 border-[#191A23] shadow-[0px_6px_0px_0px_#191A23] dark:shadow-[0px_6px_0px_0px_#000]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.slice(0, 3).map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.15 }}
                className="flex flex-col justify-between"
              >
                {/* Speech Bubble */}
                <div className="relative rounded-[30px] border-2 border-[#B9FF66] p-6 sm:p-8 bg-transparent text-white/90 text-sm sm:text-base leading-relaxed mb-6">
                  &ldquo;{item.content}&rdquo;
                  {/* Bubble pointer triangle */}
                  <div className="absolute -bottom-3 left-10 w-6 h-6 bg-[#191A23] border-b-2 border-r-2 border-[#B9FF66] rotate-45" />
                </div>

                {/* Author Info */}
                <div className="pl-6 pt-2 flex items-center gap-3">
                  <div className="relative h-10 w-10 rounded-full border-2 border-[#B9FF66] overflow-hidden">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                  </div>
                  <div>
                    <div className="font-bold text-white font-heading">{item.name}</div>
                    <div className="text-xs text-[#B9FF66] font-medium">{item.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
