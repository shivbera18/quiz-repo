"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";

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
        <section id="about" className="w-full max-w-[1240px] mx-auto px-6 md:px-8 scroll-mt-28">
            <div className="relative flex flex-col-reverse items-center md:flex-row" id="hero">
                <div className="row items-center py-5 md:w-6/12 md:pb-20 md:pt-10">
                    <div className="text-left space-y-3">
                        <h1 className="text-4xl font-medium leading-none md:text-6xl text-center md:text-left font-grotesk">Navigating the <br /> digital landscape <br /> for success</h1>
                        <p className="mt-6 mb-8 text-lg font-normal leading-7 sm:mb-12 text-center md:text-left md:pr-12">Our digital marketing agency helps businesses grow and succeed online through a range of services including SEO, PPC, social media marketing, and content creation.</p>
                        <div className="w-full justify-center md:justify-start items-center inline-flex min-h-[56px]">
                            {!isLoading ? (
                                isLoggedIn ? (
                                    <Button onClick={handleDashboardClick} className="px-8 py-5 bg-zinc-900 hover:bg-black text-white rounded-[14px]">Go to Dashboard</Button>
                                ) : (
                                    <Link href="/auth/signup"><Button className="px-8 py-5 bg-zinc-900 hover:bg-black text-white rounded-[14px]">Book a consultation</Button></Link>
                                )
                            ) : <div className="h-12 w-48 bg-gray rounded-[14px] animate-pulse" />}
                        </div>
                    </div>
                </div>
                <div className="flex items-center py-5 md:w-6/12 md:pb-20 md:pt-10 justify-center">
                    <Image src="/figma/hero-illustration.svg" alt="Hero Illustration" width={600} height={515} priority className="w-full h-auto object-contain select-none pointer-events-none" />
                </div>
            </div>

            {/* Sponsors - reference Sponsors.astro */}
            <div className="flex-row items-center mt-8">
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6">
                    {[
                        { src: "/figma/logo-amazon.svg", alt: "Amazon logo" },
                        { src: "/figma/logo-dribbble.svg", alt: "Dribbble logo" },
                        { src: "/figma/logo-hubspot.svg", alt: "HubSpot logo" },
                        { src: "/figma/logo-notion.svg", alt: "Notion logo" },
                        { src: "/figma/logo-netflix.svg", alt: "Netflix logo" },
                        { src: "/figma/logo-zoom.svg", alt: "Zoom logo" },
                    ].map((sponsor) => (
                        <div key={sponsor.alt} className="p-4 grayscale transition duration-200 hover:grayscale-0">
                            <Image src={sponsor.src} className="h-12 w-auto mx-auto" alt={sponsor.alt} width={125} height={48} />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
