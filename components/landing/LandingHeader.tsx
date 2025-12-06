"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Zap, Moon, Sun } from "lucide-react";
import Link from "next/link";

export default function LandingHeader() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [scrolled, setScrolled] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (token && user) {
            setIsLoggedIn(true);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 10);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
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
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled 
                ? "bg-background/80 backdrop-blur-xl border-b border-border" 
                : "bg-transparent"
        }`}>
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                            <Zap className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-lg font-semibold tracking-tight">Quizzy</span>
                    </Link>

                    <div className="hidden md:flex items-center gap-8">
                        <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Features
                        </Link>
                        <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Pricing
                        </Link>
                        <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            FAQ
                        </Link>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        {mounted && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                                className="h-9 w-9 text-muted-foreground hover:text-foreground"
                            >
                                {theme === "dark" ? (
                                    <Sun className="h-4 w-4" />
                                ) : (
                                    <Moon className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                        {!isLoading && (
                            <>
                                {isLoggedIn ? (
                                    <Button
                                        onClick={handleDashboardClick}
                                        size="sm"
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4"
                                    >
                                        Dashboard
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Link href="/auth/login">
                                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                                                Log in
                                            </Button>
                                        </Link>
                                        <Link href="/auth/login">
                                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4">
                                                Get Started
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
