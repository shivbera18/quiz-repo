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
        <section aria-label="Hero" className="w-full pt-28 pb-12 md:pt-36 md:pb-20 overflow-hidden">
            <div className="container mx-auto px-4 md:px-12">
                {/* 2-Column Hero */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    {/* Left Column: Heading, Description, CTA */}
                    <div className="lg:col-span-6 space-y-6 md:space-y-9 text-left">
                        <h1 className="text-4xl sm:text-5xl lg:text-[60px] font-medium tracking-tight text-[#191A23] dark:text-white font-heading leading-[1.15]">
                            Navigating the digital landscape for success
                        </h1>

                        <p className="text-base sm:text-lg md:text-xl text-[#191A23]/80 dark:text-white/80 font-normal leading-relaxed max-w-xl font-heading">
                            Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.
                        </p>

                        {!isLoading && (
                            <div className="pt-2">
                                {isLoggedIn ? (
                                    <Button
                                        onClick={handleDashboardClick}
                                        size="lg"
                                        variant="positivusDark"
                                        className="text-lg md:text-xl px-9 py-6 rounded-[14px] font-normal"
                                    >
                                        Go to Dashboard
                                    </Button>
                                ) : (
                                    <Link href="/auth/signup">
                                        <Button
                                            size="lg"
                                            variant="positivusDark"
                                            className="text-lg md:text-xl px-9 py-6 rounded-[14px] font-normal bg-[#191A23] text-white hover:bg-[#B9FF66] hover:text-[#191A23] hover:border-[#191A23] transition-all border border-[#191A23]"
                                        >
                                            Book a consultation
                                        </Button>
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right Column: Exact Figma Megaphone SVG Illustration */}
                    <div className="lg:col-span-6 flex justify-center items-center relative">
                        <div className="relative w-full max-w-[560px]">
                            <Image
                                src="/figma/hero-illustration.svg"
                                alt="Positivus Megaphone Illustration"
                                width={561}
                                height={460}
                                priority
                                className="w-full h-auto object-contain select-none pointer-events-none"
                            />
                        </div>
                    </div>
                </div>

                {/* Exact Positivus Client Logos Bar */}
                <div className="mt-16 md:mt-24 pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-6 md:gap-10 grayscale dark:invert opacity-85 hover:opacity-100 transition-opacity">
                        <Image
                            src="/figma/logo-amazon.svg"
                            alt="Amazon"
                            width={125}
                            height={48}
                            className="h-7 md:h-9 w-auto object-contain"
                        />
                        <Image
                            src="/figma/logo-dribbble.svg"
                            alt="Dribbble"
                            width={127}
                            height={48}
                            className="h-7 md:h-9 w-auto object-contain"
                        />
                        <Image
                            src="/figma/logo-hubspot.svg"
                            alt="HubSpot"
                            width={129}
                            height={48}
                            className="h-7 md:h-9 w-auto object-contain"
                        />
                        <Image
                            src="/figma/logo-notion.svg"
                            alt="Notion"
                            width={146}
                            height={48}
                            className="h-7 md:h-9 w-auto object-contain"
                        />
                        <Image
                            src="/figma/logo-netflix.svg"
                            alt="Netflix"
                            width={126}
                            height={48}
                            className="h-7 md:h-9 w-auto object-contain"
                        />
                        <Image
                            src="/figma/logo-zoom.svg"
                            alt="Zoom"
                            width={111}
                            height={48}
                            className="h-7 md:h-9 w-auto object-contain"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
