"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function HeroSection() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (token && user) setIsLoggedIn(true);
        setIsLoading(false);
    }, []);
    const handleDashboardClick = () => {
        const user = localStorage.getItem("user");
        if (user) { try { const d = JSON.parse(user); router.push(d.isAdmin ? "/admin" : "/dashboard"); return; } catch {} }
        router.push("/auth/login");
    };
    return (
        <section id="about" className="w-full max-w-[1240px] mx-auto px-6 scroll-mt-28">
            <div className="relative flex flex-col lg:flex-row gap-10 lg:gap-12 pt-12 lg:pt-20 pb-16">
                <div className="lg:w-[540px] space-y-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-muted-foreground">
                        <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Rivet Actors • live • edge
                    </div>
                    <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[0.95]">
                        Actors are the <span className="text-primary">primitive</span> for exam workloads.
                    </h1>
                    <p className="text-lg text-muted-foreground leading-relaxed max-w-[520px]">
                        One actor per exam, per student, per attempt. In-memory state, real-time scoring, and durable execution — built for banking exam scale.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2 min-h-[44px]">
                        {!isLoading ? (
                            isLoggedIn ? <Button onClick={handleDashboardClick} size="lg" className="glow-accent">Go to Dashboard →</Button>
                            : <><Link href="/auth/signup"><Button size="lg" className="glow-accent">Start building</Button></Link><Link href="/auth/login"><Button size="lg" variant="outline" className="border-white/10">View docs</Button></Link></>
                        ) : <div className="h-11 w-48 bg-white/5 rounded-md animate-pulse" />}
                    </div>
                    <div className="flex items-center gap-3 pt-2 text-xs font-mono text-muted-foreground">
                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">~20ms cold start</span>
                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">~0.6KB / actor</span>
                        <span className="px-2 py-1 rounded bg-white/5 border border-white/10">scales to zero</span>
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="glass rounded-lg overflow-hidden shine-top">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                            <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-red-500/80" /><span className="h-3 w-3 rounded-full bg-yellow-500/80" /><span className="h-3 w-3 rounded-full bg-green-500/80" />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">actor.ts — quiz attempt</span>
                            <span className="text-xs font-mono text-primary">● live</span>
                        </div>
                        <pre className="p-5 text-sm font-mono leading-relaxed overflow-x-auto">
                            <code className="text-muted-foreground">
                                <span className="text-foreground">const</span> <span className="text-white">attempt</span> = <span className="text-primary">actor</span>({"\n"}
                                {"  "}state: {"{"} answers: [], score: <span className="text-primary">0</span> {"}"}, {"\n"}
                                {"  "}run: <span className="text-primary">async</span> (c) =&gt; {"{"} {"\n"}
                                {"    "}<span className="text-primary">for await</span> (<span className="text-foreground">const</span> msg <span className="text-primary">of</span> c.queue.iter()) {"{"} {"\n"}
                                {"      "}c.state.answers.push(msg.body); {"\n"}
                                {"      "}c.state.score = <span className="text-primary">scoreQuiz</span>(c.state.answers); {"\n"}
                                {"      "}c.<span className="text-primary">broadcast</span>(<span className="text-green-400">"score"</span>, c.state.score); {"\n"}
                                {"    "}{"}"} {"\n"}
                                {"  "}{"}"} {"\n"}
                                {"}"});
                            </code>
                        </pre>
                        <div className="px-4 py-3 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-xs font-mono">
                            <span className="text-muted-foreground">client • quiz/[id]/page.tsx</span>
                            <span className="text-primary">↗ realtime</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-6 py-10 border-y border-white/10 opacity-60">
                {["SBI PO", "IBPS Clerk", "RBI Grade B", "NABARD", "SEBI", "LIC AAO"].map(s => (
                    <div key={s} className="text-center text-sm font-mono text-muted-foreground">{s}</div>
                ))}
            </div>
        </section>
    );
}
