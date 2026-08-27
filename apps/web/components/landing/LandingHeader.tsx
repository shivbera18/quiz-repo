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
        <nav aria-label="Main Navigation" className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md transition-colors py-2">
            <div className="container mx-auto px-4 md:px-12">
                <div className="flex items-center justify-between h-20">
                    <Link href="/" className="flex items-center gap-2.5 group">
                        {/* Positivus 4-point star icon */}
                        <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#191A23] dark:text-white transition-transform group-hover:rotate-12">
                            <path d="M18 0L21.8 14.2L36 18L21.8 21.8L18 36L14.2 21.8L0 18L14.2 14.2L18 0Z" fill="currentColor"/>
                        </svg>
                        <span className="font-bold text-2xl md:text-3xl tracking-tight text-[#191A23] dark:text-white font-heading">
                            Positivus
                        </span>
                    </Link>

                    {/* Nav Links */}
                    <div className="hidden md:flex items-center gap-7 lg:gap-10 text-base md:text-lg font-normal text-[#191A23] dark:text-white font-heading">
                        <a href="#about" className="hover:text-primary transition-colors">
                            About us
                        </a>
                        <a href="#services" className="hover:text-primary transition-colors">
                            Services
                        </a>
                        <a href="#use-cases" className="hover:text-primary transition-colors">
                            Use Cases
                        </a>
                        <a href="#pricing" className="hover:text-primary transition-colors">
                            Pricing
                        </a>
                        <a href="#blog" className="hover:text-primary transition-colors">
                            Blog
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
                                        size="default"
                                        className="font-medium text-base"
                                    >
                                        Dashboard →
                                    </Button>
                                ) : (
                                    <Link href="/auth/signup">
                                        <Button
                                            variant="positivusOutline"
                                            size="default"
                                            className="font-medium text-base md:text-lg px-6 py-4 rounded-[14px] border-2 border-[#191A23] dark:border-white shadow-none hover:bg-[#B9FF66] hover:text-[#191A23] hover:border-[#191A23] transition-all"
                                        >
                                            Request a quote
                                        </Button>
                                    </Link>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
