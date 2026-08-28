"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
export default function LandingHeader() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check auth state
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (token && user) {
            setIsLoggedIn(true);
        }
        setIsLoading(false);
    }, []);

    const handleDashboardClick = () => {
        const user = localStorage.getItem("user");
        if (user) {
            try {
                const userData = JSON.parse(user);
                if (userData.isAdmin) {
                    router.push("/admin");
                } else {
                    router.push("/dashboard");
                }
            } catch (e) {
                router.push("/auth/login");
            }
        } else {
            router.push("/auth/login");
        }
    };

    return (
        <nav aria-label="Main Navigation" className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b-2 border-[#191A23] dark:border-white/20 transition-colors">
            <div className="container mx-auto px-4 md:px-8">
                <div className="flex items-center justify-between h-20">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="h-9 w-9 rounded-lg bg-[#B9FF66] border-2 border-[#191A23] flex items-center justify-center font-black text-[#191A23] text-lg shadow-[2px_2px_0px_0px_#191A23] group-hover:translate-y-[-1px] transition-transform">
                            ✦
                        </div>
                        <span className="font-bold text-2xl tracking-tight text-foreground font-heading">
                            Positivus<span className="text-[#B9FF66] font-black">.</span>
                        </span>
                    </Link>

                    {/* Nav Links */}
                    <div className="hidden lg:flex items-center gap-8 text-sm font-medium text-foreground">
                        <a href="#services" className="hover:text-primary transition-colors hover:underline underline-offset-4">
                            Services
                        </a>
                        <a href="#process" className="hover:text-primary transition-colors hover:underline underline-offset-4">
                            Working Process
                        </a>
                        <a href="#pricing" className="hover:text-primary transition-colors hover:underline underline-offset-4">
                            Pricing
                        </a>
                        <a href="#faq" className="hover:text-primary transition-colors hover:underline underline-offset-4">
                            FAQ
                        </a>
                    </div>

                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        {!isLoading && (
                            <>
                                {isLoggedIn ? (
                                    <Button
                                        onClick={handleDashboardClick}
                                        variant="positivus"
                                        size="sm"
                                        className="font-bold"
                                    >
                                        Dashboard →
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Link href="/auth/login">
                                            <Button variant="ghost" size="sm" className="font-medium text-sm">
                                                Log in
                                            </Button>
                                        </Link>
                                        <Link href="/auth/signup">
                                            <Button variant="positivusOutline" size="sm" className="hidden sm:inline-flex">
                                                Request a quote
                                            </Button>
                                        </Link>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
