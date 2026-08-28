"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight as ArrowRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Trophy from "../svgs/Trophy";
import Image from "next/image";

interface Testimonial {
    name: string;
    image: string;
}

const testimonials: Testimonial[] = [
    { name: "Priya S.", image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=faces" },
    { name: "Rajesh K.", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=faces" },
    { name: "Anjali G.", image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=faces" },
    { name: "Vikram S.", image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=faces" },
    { name: "Sneha P.", image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=faces" },
    { name: "Arun M.", image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=faces" },
    { name: "Meera R.", image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=faces" },
];

export default function HeroSection() {
    const router = useRouter();
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
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
        <section aria-label="Hero" className="w-full pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden">
            <div className="container mx-auto px-4 md:px-8">
                {/* 2-Column Hero */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
                    {/* Left: Headline & CTA */}
                    <div className="lg:col-span-6 space-y-6 md:space-y-8 text-left">
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-medium tracking-tight text-foreground font-heading leading-[1.15]">
                            Navigating the digital landscape for{" "}
                            <span className="bg-[#B9FF66] text-[#191A23] px-2 py-0.5 rounded-[7px] border border-[#191A23] inline-block font-bold">
                                exam success
                            </span>
                        </h1>

                        <p className="text-base sm:text-lg md:text-xl text-muted-foreground font-normal leading-relaxed max-w-xl">
                            Our comprehensive banking exam platform helps thousands of students clear SBI, IBPS, and RBI exams with timed mock tests, sectional drills, and instant AI analytics.
                        </p>

                        {!isLoading && (
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                                {isLoggedIn ? (
                                    <Button
                                        onClick={handleDashboardClick}
                                        size="lg"
                                        variant="positivusDark"
                                        className="gap-3 text-base"
                                    >
                                        Go to Dashboard <ArrowRightIcon className="size-5" />
                                    </Button>
                                ) : (
                                    <>
                                        <Link href="/auth/signup">
                                            <Button
                                                size="lg"
                                                variant="positivusDark"
                                                className="w-full sm:w-auto gap-3 text-base font-bold"
                                            >
                                                Book a free test <ArrowRightIcon className="size-5" />
                                            </Button>
                                        </Link>
                                        <Link href="/auth/login">
                                            <Button
                                                size="lg"
                                                variant="positivusOutline"
                                                className="w-full sm:w-auto gap-2 text-base font-bold"
                                            >
                                                Sign in
                                            </Button>
                                        </Link>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Student Social Proof */}
                        <div className="flex items-center gap-3 pt-2">
                            <div className="flex -space-x-3">
                                {testimonials.slice(0, 5).map((testimonial, idx) => (
                                    <div
                                        key={idx}
                                        className="relative h-9 w-9 rounded-full border-2 border-background overflow-hidden shadow-sm"
                                    >
                                        <Image
                                            src={testimonial.image}
                                            alt={testimonial.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                                Joined by <span className="text-foreground font-bold">10,000+</span> aspiring bankers
                            </p>
                        </div>
                    </div>

                    {/* Right: Positivus Styled Graphic Frame */}
                    <div className="lg:col-span-6 flex justify-center items-center relative">
                        <div className="relative w-full max-w-lg aspect-[4/3] rounded-[45px] bg-[#F3F3F3] dark:bg-[#1E1F2A] border-2 border-[#191A23] dark:border-white/30 shadow-[0px_8px_0px_0px_#191A23] dark:shadow-[0px_8px_0px_0px_#000] p-6 md:p-8 flex flex-col justify-between overflow-hidden">
                            {/* Decorative top pill */}
                            <div className="flex items-center justify-between">
                                <span className="px-3 py-1 bg-[#B9FF66] text-[#191A23] font-bold text-xs md:text-sm rounded-[7px] border border-[#191A23] flex items-center gap-1.5 shadow-[2px_2px_0px_0px_#191A23]">
                                    <span className="h-2 w-2 rounded-full bg-[#191A23] animate-pulse" />
                                    Live Practice Engine
                                </span>
                                <div className="h-8 w-8 rounded-full bg-[#191A23] text-[#B9FF66] flex items-center justify-center font-black text-sm">
                                    ✦
                                </div>
                            </div>

                            {/* Centered Graphic Composition */}
                            <div className="my-auto py-6 flex flex-col items-center justify-center text-center space-y-3">
                                <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-[#B9FF66] border-2 border-[#191A23] flex items-center justify-center shadow-[4px_4px_0px_0px_#191A23] rotate-[-6deg]">
                                    <Trophy className="h-10 w-10 md:h-12 md:w-12 text-[#191A23]" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-xl md:text-2xl text-foreground font-heading">
                                        99.4th Percentile
                                    </h3>
                                    <p className="text-xs md:text-sm text-muted-foreground font-medium">
                                        Target score accuracy with adaptive mocks
                                    </p>
                                </div>
                            </div>

                            {/* Bottom stats row */}
                            <div className="grid grid-cols-3 gap-2 pt-4 border-t-2 border-[#191A23]/10 dark:border-white/10 text-center">
                                <div className="p-2 rounded-xl bg-background border border-[#191A23]/20">
                                    <div className="font-bold text-base md:text-lg text-foreground">1,200+</div>
                                    <div className="text-[10px] text-muted-foreground font-semibold">Questions</div>
                                </div>
                                <div className="p-2 rounded-xl bg-[#B9FF66] text-[#191A23] border border-[#191A23] font-bold">
                                    <div className="text-base md:text-lg">0.25s</div>
                                    <div className="text-[10px] text-[#191A23]/80 font-bold">Scoring Speed</div>
                                </div>
                                <div className="p-2 rounded-xl bg-background border border-[#191A23]/20">
                                    <div className="font-bold text-base md:text-lg text-foreground">100%</div>
                                    <div className="text-[10px] text-muted-foreground font-semibold">Exam Ready</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Positivus Client Logos Bar */}
                <div className="mt-16 md:mt-24 pt-8 border-t border-[#191A23]/10 dark:border-white/10">
                    <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground text-center mb-6">
                        Structured for Candidates Targeting Top Institutions
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all">
                        {["State Bank of India", "IBPS PO & Clerk", "Reserve Bank of India", "NABARD Grade A", "SEBI Grade A", "LIC AAO"].map((org, i) => (
                            <span
                                key={i}
                                className="font-bold text-base md:text-lg tracking-wider text-foreground/80 font-heading hover:text-foreground transition-colors"
                            >
                                {org}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
