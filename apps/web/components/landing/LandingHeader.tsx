"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { QuizzyLogo } from "@/components/ui/quizzy-logo";

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
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b-4 border-black dark:border-white/65 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.65)]">
            <div className="container mx-auto px-4 md:px-6">
                <div className="flex items-center justify-between h-16">
                    <Link href="/" className="flex items-center">
                        <QuizzyLogo size="md" showText={true} />
                    </Link>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        {!isLoading && (
                            <>
                                {isLoggedIn ? (
                                    <Button
                                        onClick={handleDashboardClick}
                                        variant="neobrutalist"
                                        className="gap-2"
                                    >
                                        Go to Dashboard
                                    </Button>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <Link href="/auth/login">
                                            <Button variant="ghost" className="hover:bg-primary/10">
                                                Login
                                            </Button>
                                        </Link>
                                        <Link href="/auth/login">
                                            <Button variant="neobrutalist">Get Started</Button>
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
