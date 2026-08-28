"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, X, Sparkles, Zap, Crown } from "lucide-react"
import Link from "next/link"
import Science from "../svgs/Science"
import Cap from "../svgs/Cap"
import Calculator from "../svgs/Calculator"
import Trophy from "../svgs/Trophy"

const plans = [
  {
    name: "Free",
    description: "Perfect for getting started",
    price: "₹0",
    period: "forever",
    icon: Sparkles,
    color: "bg-green-400",
    features: [
      { text: "50 Practice Questions/day", included: true },
      { text: "Basic Analytics", included: true },
      { text: "2 Mock Tests/month", included: true },
      { text: "Mobile App Access", included: true },
      { text: "Advanced Analytics", included: false },
      { text: "Unlimited Mock Tests", included: false },
      { text: "Priority Support", included: false },
    ],
    buttonText: "Get Started",
    buttonVariant: "outline" as const,
    popular: false,
  },
  {
    name: "Pro",
    description: "Most popular for serious aspirants",
    price: "₹299",
    period: "per month",
    icon: Zap,
    color: "bg-primary",
    features: [
      { text: "Unlimited Questions", included: true },
      { text: "Advanced Analytics", included: true },
      { text: "Unlimited Mock Tests", included: true },
      { text: "Mobile App Access", included: true },
      { text: "Performance Reports", included: true },
      { text: "Sectional Tests", included: true },
      { text: "Email Support", included: true },
    ],
    buttonText: "Start Pro Trial",
    buttonVariant: "default" as const,
    popular: true,
  },
  {
    name: "Premium",
    description: "For those who want it all",
    price: "₹599",
    period: "per month",
    icon: Crown,
    color: "bg-yellow-400",
    features: [
      { text: "Everything in Pro", included: true },
      { text: "1-on-1 Doubt Sessions", included: true },
      { text: "Previous Year Papers", included: true },
      { text: "Personalized Study Plan", included: true },
      { text: "Interview Preparation", included: true },
      { text: "Priority Support 24/7", included: true },
      { text: "Certificate on Completion", included: true },
    ],
    buttonText: "Go Premium",
    buttonVariant: "outline" as const,
    popular: false,
  },
]

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-32 relative overflow-hidden">
      {/* Decorative SVG Elements */}
      <Science className="absolute top-10 right-10 size-24 md:size-40 text-foreground opacity-10" />
      <Cap className="absolute bottom-20 left-10 size-24 md:size-40 text-foreground opacity-10" />
      <Calculator className="absolute top-1/3 left-20 size-16 md:size-28 text-foreground opacity-10 hidden lg:block" />
      <Trophy className="absolute bottom-1/3 right-20 size-20 md:size-32 text-foreground opacity-10 hidden lg:block" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-2 bg-primary/10 border-2 border-primary rounded-full text-sm font-bold text-primary mb-4">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4">
            Simple,{" "}
            <span className="relative inline-block">
              <span className="relative z-10">Affordable</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-yellow-400 -z-10 -rotate-1" />
            </span>
            {" "}Plans
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your preparation needs. Upgrade or downgrade anytime.
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative ${plan.popular ? 'md:-mt-4 md:mb-4' : ''}`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary border-3 border-foreground rounded-full text-sm font-bold text-primary-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] dark:shadow-[3px_3px_0px_0px_rgba(255,255,255,0.2)] z-10">
                  Most Popular
                </div>
              )}

              <div className={`h-full p-6 md:p-8 bg-card border-4 border-foreground rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:shadow-[8px_8px_0px_0px_rgba(255,255,255,0.2)] ${plan.popular ? 'ring-4 ring-primary' : ''}`}>
                {/* Icon */}
                <div className={`h-14 w-14 ${plan.color} border-4 border-foreground rounded-xl flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]`}>
                  <plan.icon className="h-7 w-7 text-foreground" />
                </div>

                {/* Plan Info */}
                <h3 className="text-2xl font-black mb-1">{plan.name}</h3>
                <p className="text-muted-foreground mb-4">{plan.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-4xl md:text-5xl font-black">{plan.price}</span>
                  <span className="text-muted-foreground ml-2">/{plan.period}</span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3">
                      {feature.included ? (
                        <div className="h-6 w-6 bg-green-400 border-2 border-foreground rounded-md flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.2)]">
                          <Check className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="h-6 w-6 bg-muted border-2 border-border rounded-md flex items-center justify-center">
                          <X className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className={feature.included ? '' : 'text-muted-foreground'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Link href="/auth/login" className="block">
                  <Button 
                    variant={plan.buttonVariant}
                    className={`w-full border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[2px_2px_0px_0px_rgba(255,255,255,0.75)] transition-all font-bold ${plan.popular ? 'h-14 text-lg' : 'h-12'}`}
                  >
                    {plan.buttonText}
                  </Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Money Back Guarantee */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground">
            🛡️ <strong>7-day money-back guarantee</strong> on all paid plans. No questions asked.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
