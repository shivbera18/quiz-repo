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
    <section id="pricing" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 md:px-8">
        {/* Positivus Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 mb-16">
          <div className="px-3 py-1 bg-[#B9FF66] text-[#191A23] text-2xl sm:text-3xl md:text-4xl font-bold rounded-[7px] border-2 border-[#191A23] font-heading shrink-0 shadow-[2px_2px_0px_0px_#191A23]">
            Pricing
          </div>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl font-medium leading-relaxed">
            Flexible and transparent plans designed to fit every student&apos;s preparation timeline and goals.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-10">
          {plans.map((plan, idx) => {
            const isPopular = plan.popular;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`relative rounded-[35px] md:rounded-[45px] p-8 md:p-10 border-2 border-[#191A23] dark:border-white/30 shadow-[0px_6px_0px_0px_#191A23] dark:shadow-[0px_6px_0px_0px_#000] flex flex-col justify-between transition-all ${
                  isPopular
                    ? "bg-[#191A23] text-white"
                    : "bg-[#F3F3F3] dark:bg-[#1E1F2A] text-foreground"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-4 right-8 px-3.5 py-1 bg-[#B9FF66] text-[#191A23] text-xs font-black rounded-full border-2 border-[#191A23] shadow-[2px_2px_0px_0px_#191A23] uppercase tracking-wider">
                    Most Popular
                  </div>
                )}

                <div className="space-y-6">
                  <div>
                    <h3 className="text-2xl md:text-3xl font-bold font-heading">{plan.name}</h3>
                    <p className={`text-sm mt-1 font-medium ${isPopular ? "text-white/70" : "text-muted-foreground"}`}>
                      {plan.description}
                    </p>
                  </div>

                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl md:text-5xl font-black font-heading">{plan.price}</span>
                    <span className={`text-sm font-medium ${isPopular ? "text-white/60" : "text-muted-foreground"}`}>
                      /{plan.period}
                    </span>
                  </div>

                  <div className="space-y-3.5 pt-4 border-t-2 border-current/10">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        {feature.included ? (
                          <div className="h-5 w-5 rounded-full bg-[#B9FF66] text-[#191A23] border border-[#191A23] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground">
                            <X className="h-3 w-3" />
                          </div>
                        )}
                        <span className={feature.included ? "font-medium" : "text-muted-foreground line-through opacity-60"}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8">
                  <Link href="/auth/signup" className="w-full block">
                    <Button
                      variant={isPopular ? "positivus" : "positivusDark"}
                      className="w-full font-bold text-base h-12"
                    >
                      {plan.buttonText}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  )
}
