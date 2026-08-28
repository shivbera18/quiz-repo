"use client";

import Link from "next/link";

const cards = [
  { title: "Sectional Drills", desc: "Topic-wise timing with instant scoring and negative marking.", href: "/dashboard/sectional-tests", mono: "01 — sectional" },
  { title: "Full Mocks", desc: "Exact SBI/IBPS/RBI pattern with sectional limits.", href: "/dashboard/full-mock-tests", mono: "02 — mocks" },
  { title: "AI Generator", desc: "Generate practice sets and flashcards on demand.", href: "/dashboard/flash-cards", mono: "03 — ai" },
  { title: "Leaderboards", desc: "Weekly ISO rotation with speed tie-breaking.", href: "/dashboard", mono: "04 — ranks" },
  { title: "Analytics", desc: "90-day streaks, p-values, and time-per-question.", href: "/analytics", mono: "05 — insights" },
  { title: "Scheduled Exams", desc: "Server-clock gated windows with snapshot scoring.", href: "/dashboard", mono: "06 — schedule" },
];

export default function FeaturesSection() {
  return (
    <section id="services" className="w-full max-w-[1240px] mx-auto px-6 scroll-mt-28">
      <div className="mt-20">
        <div className="flex flex-col gap-4 mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-mono text-primary">● services</div>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Everything for the exam lifecycle</h2>
          <p className="text-muted-foreground max-w-[640px]">From sectional speed to full mocks, the platform mirrors Rivet's actor model — one primitive, many workloads.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((c) => (
            <Link key={c.title} href={c.href} className="glass rounded-lg p-6 hover:bg-white/[0.04] transition-colors group shine-top block">
              <div className="text-xs font-mono text-primary mb-3">{c.mono}</div>
              <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{c.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
              <div className="mt-4 text-xs font-mono text-muted-foreground group-hover:text-foreground">Learn more →</div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
