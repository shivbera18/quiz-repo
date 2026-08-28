"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export default function LandingHeader() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (token && user) setIsLoggedIn(true);
        setIsLoading(false);
    }, []);
    const handleDashboardClick = () => {
        const user = localStorage.getItem("user");
        if (user) {
            try { const d = JSON.parse(user); router.push(d.isAdmin ? "/admin" : "/dashboard"); return; } catch {}
        }
        router.push("/auth/login");
    };
    return (
        <div className="h-[72px]">
            <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
                <div className="max-w-[1240px] mx-auto px-6 flex items-center justify-between h-[72px]">
                    <Link href="/" className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center font-mono font-bold text-primary-foreground text-sm">R</div>
                        <span className="font-semibold text-lg tracking-tight">rivet<span className="text-primary">.quiz</span></span>
                        <span className="hidden sm:inline-flex ml-2 px-2 py-0.5 rounded bg-white/10 border border-white/10 text-xs font-mono text-muted-foreground">actors</span>
                    </Link>
                    <div className="hidden lg:flex items-center gap-8 text-sm font-mono text-muted-foreground">
                        <a href="#services" className="hover:text-foreground transition-colors">Services</a>
                        <a href="#use-cases" className="hover:text-foreground transition-colors">Use Cases</a>
                        <a href="#process" className="hover:text-foreground transition-colors">Process</a>
                        <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden lg:flex items-center gap-3 min-w-[160px] justify-end">
                            {!isLoading ? (
                                isLoggedIn ? (
                                    <Button onClick={handleDashboardClick} className="glow-accent">Dashboard →</Button>
                                ) : (
                                    <Link href="/auth/signup"><Button className="glow-accent">Get started</Button></Link>
                                )
                            ) : <div className="h-9 w-32 rounded-md bg-white/5 animate-pulse" />}
                        </div>
                        <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden h-9 w-9 rounded-md border border-white/10 bg-white/5 flex items-center justify-center" aria-expanded={mobileMenuOpen} aria-controls="menu-items" aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}>
                            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
                {mobileMenuOpen && (
                    <div id="menu-items" className="lg:hidden border-t border-white/10 bg-card">
                        <div className="px-6 py-6 flex flex-col gap-4 font-mono text-sm">
                            <a href="#services" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">Services</a>
                            <a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">Use Cases</a>
                            <a href="#process" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">Process</a>
                            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2 text-muted-foreground hover:text-foreground">Pricing</a>
                            <div className="pt-4">
                                {!isLoading && (isLoggedIn ? <Button onClick={handleDashboardClick} className="w-full">Dashboard</Button> : <Link href="/auth/signup" className="w-full"><Button className="w-full">Get started</Button></Link>)}
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </div>
    );
}
