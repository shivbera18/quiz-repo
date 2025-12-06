"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
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
            "Mobile App Access",
        ],
        buttonText: "Get Started",
        popular: false,
    },
    {
        name: "Pro",
        description: "Most popular for serious aspirants",
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
        description: "For those who want it all",
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
        <section id="pricing" className="py-24 sm:py-32 relative">
            <div className="container mx-auto px-4">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <p className="text-sm font-medium text-primary mb-4">Pricing</p>
                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight mb-4">
                        Simple, transparent pricing
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
                            className={`relative p-6 rounded-xl border transition-all duration-300 ${
                                plan.popular
                                    ? "bg-card border-primary/50 glow-purple-sm"
                                    : "bg-card/50 border-border/50 hover:border-border"
                            }`}
                        >
                            {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                                    Most Popular
                                </div>
                            )}

                            <div className="mb-6">
                                <h3 className="text-lg font-medium mb-1">{plan.name}</h3>
                                <p className="text-sm text-muted-foreground">{plan.description}</p>
                            </div>

                            <div className="mb-6">
                                <span className="text-4xl font-semibold">{plan.price}</span>
                                <span className="text-muted-foreground ml-2">/{plan.period}</span>
                            </div>

                            <ul className="space-y-3 mb-8">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-3 text-sm">
                                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                                        <span className="text-muted-foreground">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <Link href="/auth/login" className="block">
                                <Button
                                    className={`w-full rounded-lg ${
                                        plan.popular
                                            ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                            : "bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                                    }`}
                                >
                                    {plan.buttonText}
                                </Button>
                            </Link>
                        </motion.div>
                    ))}
                </div>

                {/* Money back guarantee */}
                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="text-center text-sm text-muted-foreground mt-12"
                >
                    🛡️ 7-day money-back guarantee on all paid plans. No questions asked.
                </motion.p>
            </div>
        </section>
    );
}
