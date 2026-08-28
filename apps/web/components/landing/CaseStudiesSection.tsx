"use client";

import Link from "next/link";

const cases = [
  { text: "Local institute targeted PPC drills → 50% more attempts and 25% higher cutoff clearance.", href: "/dashboard/sectional-tests" },
  { text: "B2B academy built SEO strategy → first page for keywords + 200% organic traffic.", href: "/dashboard/full-mock-tests" },
  { text: "National chain ran social campaign → 25% follower growth and 20% online sales lift.", href: "/analytics" },
];

export default function CaseStudiesSection() {
  return (
    <section id="use-cases" className="w-full max-w-[1240px] mx-auto px-6 scroll-mt-28">
      <div className="flex flex-col gap-4 mb-10 mt-16">
        <div className="text-xs font-mono text-primary">● case studies</div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Proven at scale</h2>
        <p className="text-muted-foreground max-w-[640px]">Real deployments using the actor primitive for durable, stateful workloads.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {cases.map((c, i) => (
          <div key={i} className="glass rounded-lg p-6 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{c.text}</p>
            <Link href={c.href} className="text-sm font-mono text-primary hover:underline">Learn more →</Link>
          </div>
        ))}
      </div>
    </section>
  );
}
