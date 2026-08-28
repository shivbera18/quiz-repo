"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
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
        <div className="mt-20">
            <nav className="w-full top-0 left-0 z-50 fixed bg-white dark:bg-dark border-b border-transparent dark:border-white/10">
                <header className="flex flex-col lg:flex-row justify-between items-center my-5 px-6 md:px-8 lg:px-12 max-w-[1240px] mx-auto">
                    <div className="flex w-full lg:w-auto items-center justify-between">
                        <Link href="/" className="flex items-center gap-2.5">
                            <svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-black dark:text-white">
                                <path d="M18 0L21.8 14.2L36 18L21.8 21.8L18 36L14.2 21.8L0 18L14.2 14.2L18 0Z" fill="currentColor"/>
                            </svg>
                            <span className="font-medium text-2xl tracking-tight text-black dark:text-white font-grotesk">
                                Positivus
                            </span>
                        </Link>
                        <div className="block lg:hidden">
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="w-8 h-8 text-black dark:text-white cursor-pointer"
                                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                                aria-expanded={mobileMenuOpen}
                                aria-controls="menu-items"
                            >
                                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                            </button>
                        </div>
                    </div>

                    <nav id="menu-items" className={`${mobileMenuOpen ? "flex" : "hidden"} w-full lg:w-auto mt-2 lg:flex lg:mt-0`}>
                        <ul className="font-medium flex flex-col p-4 lg:p-0 mt-4 border rounded-lg lg:flex-row lg:space-x-8 lg:mt-0 lg:border-0 bg-white dark:bg-dark w-full lg:w-auto items-center">
                            <li><a href="#about" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 text-black dark:text-white rounded lg:bg-transparent lg:p-0">About us</a></li>
                            <li><a href="#services" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 text-black dark:text-white rounded lg:bg-transparent lg:p-0">Services</a></li>
                            <li><a href="#use-cases" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 text-black dark:text-white rounded lg:bg-transparent lg:p-0">Use Cases</a></li>
                            <li><a href="#process" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 text-black dark:text-white rounded lg:bg-transparent lg:p-0">Pricing</a></li>
                            <li><a href="#testimonials" onClick={() => setMobileMenuOpen(false)} className="block py-2 px-3 text-black dark:text-white rounded lg:bg-transparent lg:p-0">Blog</a></li>
                            <li className="lg:hidden flex items-center justify-center mt-3 gap-4">
                                <div className="min-w-[140px] flex justify-center">
                                    {!isLoading ? (
                                        isLoggedIn ? (
                                            <Button onClick={handleDashboardClick} className="px-9 py-5 rounded-2xl border border-zinc-900 bg-zinc-900 text-white">Dashboard →</Button>
                                        ) : (
                                            <Link href="/auth/signup"><Button variant="outline" className="px-9 py-5 rounded-2xl border border-zinc-900 bg-white text-black hover:bg-black hover:text-white">Request a quote</Button></Link>
                                        )
                                    ) : <div className="h-11 w-32 rounded-2xl bg-gray animate-pulse" />}
                                </div>
                            </li>
                        </ul>
                    </nav>

                    <div className="hidden lg:flex items-center gap-4">
                        <ThemeToggle />
                        <div className="min-w-[160px] flex justify-end">
                            {!isLoading ? (
                                isLoggedIn ? (
                                    <Button onClick={handleDashboardClick} className="px-9 py-5 rounded-2xl border border-zinc-900 bg-zinc-900 text-white hover:bg-black">Dashboard →</Button>
                                ) : (
                                    <Link href="/auth/signup"><Button variant="outline" className="px-9 py-5 rounded-2xl border border-zinc-900 bg-white hover:bg-black text-black hover:text-white">Request a quote</Button></Link>
                                )
                            ) : <div className="h-11 w-36 rounded-2xl bg-gray animate-pulse" />}
                        </div>
                    </div>
                </header>
            </nav>
        </div>
    );
}
