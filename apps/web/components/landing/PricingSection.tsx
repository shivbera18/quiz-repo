"use client";

import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import Link from "next/link";

const plans = [
  { name: "Free", price: "₹0", period: "forever", desc: "For getting started", features: ["50 questions/day", "Basic analytics", "2 mocks/month"], cta: "Get Started", popular: false },
  { name: "Pro", price: "₹299", period: "per month", desc: "Most popular", features: ["Unlimited questions", "Advanced analytics", "Unlimited mocks", "Priority support"], cta: "Start Pro Trial", popular: true },
  { name: "Premium", price: "₹599", period: "per month", desc: "Everything", features: ["All Pro features", "1:1 mentorship", "Custom reports"], cta: "Go Premium", popular: false },
];

export default function PricingSection() {
  return (
    <section id="pricing" className="w-full max-w-[1240px] mx-auto px-6 scroll-mt-28">
      <div className="mt-16">
        <div className="text-xs font-mono text-primary mb-4">● pricing</div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Pricing</h2>
        <p className="text-muted-foreground mt-2">Transparent plans for every team.</p>
        <div className="grid md:grid-cols-3 gap-4 mt-10">
          {plans.map(p => (
            <div key={p.name} className={`rounded-lg border p-6 flex flex-col ${p.popular ? "bg-primary text-primary-foreground border-primary glow-accent" : "glass"}`}>
              <div className="font-mono text-xs opacity-70">{p.desc}</div>
              <h3 className="text-xl font-semibold mt-1">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1"><span className="text-3xl font-bold">{p.price}</span><span className="text-sm opacity-70">/{p.period}</span></div>
              <ul className="mt-6 space-y-2 flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm"><span className={`h-5 w-5 rounded-full flex items-center justify-center ${p.popular ? "bg-white text-primary" : "bg-primary text-primary-foreground"}`}><Check className="h-3 w-3" /></span>{f}</li>
                ))}
              </ul>
              <Link href="/auth/signup" className="mt-6"><Button variant={p.popular ? "secondary" : "default"} className="w-full">{p.cta}</Button></Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
