"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function CTASection() {
  return (
    <section className="w-full max-w-[1240px] mx-auto px-6">
      <div className="glass rounded-lg p-8 md:p-10 mt-16 flex flex-col md:flex-row items-center justify-between gap-6 shine-top">
        <div>
          <div className="text-xs font-mono text-primary mb-2">● proposal</div>
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Let&apos;s make things happen</h2>
          <p className="text-muted-foreground mt-2 max-w-[560px]">Contact us to learn how our platform can help your institute scale mock delivery with Rivet-style actors.</p>
        </div>
        <Link href="/auth/signup"><Button size="lg" className="glow-accent">Get your free proposal</Button></Link>
      </div>
    </section>
  );
}
