"use client";

import { useState } from "react";

const steps = [
  { n: "01", t: "Consultation", d: "We discuss goals, audience, and current efforts to tailor the strategy." },
  { n: "02", t: "Research", d: "We research audience, competitors, and trends to craft a data-driven plan." },
  { n: "03", t: "Implementation", d: "We optimize, create content, and launch campaigns." },
  { n: "04", t: "Monitoring", d: "We monitor and optimize for performance and ROI." },
  { n: "05", t: "Reporting", d: "Regular reports and transparent communication." },
  { n: "06", t: "Improvement", d: "Scale what works and iterate continuously." },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="process" className="w-full max-w-[1240px] mx-auto px-6 scroll-mt-28">
      <div className="mt-16">
        <div className="text-xs font-mono text-primary mb-4">● process</div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Our Working Process</h2>
        <p className="text-muted-foreground mt-2 max-w-[640px]">Step-by-step guide to achieving your business goals.</p>
        <div className="mt-10 space-y-3">
          {steps.map((s, i) => {
            const isOpen = open === i;
            return (
              <div key={s.n} className={`rounded-lg border transition-colors ${isOpen ? "bg-white/[0.04] border-white/10" : "glass"}`}>
                <button onClick={() => setOpen(isOpen ? null : i)} className="w-full flex items-center justify-between p-6 text-left">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl font-mono text-primary">{s.n}</span>
                    <span className="font-medium">{s.t}</span>
                  </div>
                  <span className={`h-8 w-8 rounded-full border flex items-center justify-center text-sm ${isOpen ? "bg-primary text-primary-foreground border-primary" : "border-white/10"}`}>{isOpen ? "−" : "+"}</span>
                </button>
                {isOpen && <div className="px-6 pb-6 text-sm text-muted-foreground border-t border-white/10 pt-4 mx-6">{s.d}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
