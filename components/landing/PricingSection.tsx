"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, Sparkles } from "lucide-react";
import Link from "next/link";

const plans = [
    {
        name: "Free",
        description: "Perfect for getting started",
        price: "₹0",
        period: "forever",
        features: [
            "50 Practice Questions/day",
            "Basic Analytics",
            "2 Mock Tests/month",
            "Mobile Access",
        ],
        buttonText: "Get Started",
        popular: false,
    },
    {
        name: "Pro",
        description: "For serious aspirants",
        price: "₹299",
        period: "per month",
        features: [
            "Unlimited Questions",
            "Advanced Analytics",
            "Unlimited Mock Tests",
            "Performance Reports",
            "Sectional Tests",
            "Priority Support",
        ],
        buttonText: "Start Pro Trial",
        popular: true,
    },
    {
        name: "Premium",
        description: "Everything you need",
        price: "₹599",
        period: "per month",
        features: [
            "Everything in Pro",
            "1-on-1 Doubt Sessions",
            "Previous Year Papers",
            "Personalized Study Plan",
            "Interview Preparation",
            "24/7 Priority Support",
        ],
        buttonText: "Go Premium",
        popular: false,
    },
];

export default function PricingSection() {
    return (
        <section id="pricing" className="py-32 relative overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 linear-bg opacity-30" />

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
                        Pricing
                    </p>
                    <h2 className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6">
                        Simple, transparent
                        <br />
                        <span className="text-muted-foreground">pricing</span>
                    </h2>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Choose the plan that fits your preparation needs. Upgrade or downgrade anytime.
                    </p>
                </motion.div>

                {/* Pricing cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                    {plans.map((plan, index) => (
                        <motion.div
                            key={plan.name}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`relative ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full shadow-lg glow-sm">
                                        <Sparkles className="h-3 w-3" />
                                        Most Popular
                                    </div>
                                </div>
                            )}

                            <div className={`relative p-8 rounded-2xl border transition-all duration-500 card-hover backdrop-blur-sm h-full flex flex-col ${
                                plan.popular
                                    ? "bg-card border-primary/30 glow"
                                    : "bg-card/50 border-border/50 hover:border-border"
                            }`}>
                                <div className="mb-8">
                                    <h3 className="text-xl font-medium mb-2">{plan.name}</h3>
                                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                                </div>

                                <div className="mb-8">
                                    <span className="text-5xl font-semibold">{plan.price}</span>
                                    <span className="text-muted-foreground ml-2">/{plan.period}</span>
                                </div>

                                <ul className="space-y-4 mb-8 flex-1">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-start gap-3">
                                            <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                                <Check className="h-3 w-3 text-primary" />
                                            </div>
                                            <span className="text-muted-foreground text-sm">{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Link href="/auth/login" className="block">
                                    <Button
                                        className={`w-full rounded-xl h-12 font-medium ${
                                            plan.popular
                                                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                                : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                                        }`}
                                    >
                                        {plan.buttonText}
                                    </Button>
                                </Link>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Money back guarantee */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-center text-sm text-muted-foreground mt-16"
                >
                    🛡️ 7-day money-back guarantee on all paid plans. No questions asked.
                </motion.p>
            </div>
        </section>
    );
}
