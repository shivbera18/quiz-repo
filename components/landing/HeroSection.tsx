"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight as ArrowRightIcon, BookOpen as BookOpenIcon, Star as StarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import HandDrawnArrow from "../svgs/HandDrawnArrow";
import Science from "../svgs/Science";
import Cap from "../svgs/Cap";
import Atom from "../svgs/Atom";
import Trophy from "../svgs/Trophy";
import Calculator from "../svgs/Calculator";
import Book from "../svgs/Book";
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
    const [titleNumber, setTitleNumber] = useState(0);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const titles = useMemo(
        () => ["smart", "fast", "efficient", "quick", "effective"],
        [],
    );

    useEffect(() => {
        // Check auth state
        const token = localStorage.getItem("token");
        const user = localStorage.getItem("user");
        if (token && user) {
            setIsLoggedIn(true);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (titleNumber === titles.length - 1) {
                setTitleNumber(0);
            } else {
                setTitleNumber(titleNumber + 1);
            }
        }, 2000);
        return () => clearTimeout(timeoutId);
    }, [titleNumber, titles]);

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
        <div className="w-full pt-20">
            <div className="container mx-auto">
                <div className="relative flex flex-col items-center justify-center gap-8 py-10 lg:py-20">
                    <Science className="absolute top-4 left-4 size-24 md:size-64 text-foreground opacity-20" />
                    <Cap className="absolute right-10 -bottom-16 size-24 md:bottom-10 md:size-64 lg:bottom-0 text-foreground opacity-20" />
                    <Atom className="absolute top-20 right-20 size-16 md:size-32 text-foreground opacity-15 hidden md:block" />
                    <Trophy className="absolute bottom-32 left-16 size-20 md:size-40 text-foreground opacity-15 hidden lg:block" />
                    <Calculator className="absolute top-40 left-32 size-16 md:size-28 text-foreground opacity-15 hidden lg:block" />
                    <Book className="absolute bottom-20 right-32 size-16 md:size-28 text-foreground opacity-15 hidden lg:block" />
                    <div>
                        <Button variant="secondary" size="sm" className="gap-4">
                            Now it is time to ace your exams{" "}
                            <ArrowRightIcon className="size-4" />
                        </Button>
                    </div>
                    <div className="flex flex-col gap-4">
                        <h1 className="max-w-2xl text-center text-5xl tracking-tighter md:text-7xl font-black">
                            <span className="relative inline-block">
                                Your all-in-one learning platform
                                <HandDrawnArrow className="absolute right-2 mx-auto mt-4 size-8 md:-right-8 md:size-12 text-foreground opacity-40" />
                            </span>

                            <span className="relative flex w-full justify-center overflow-hidden text-center md:pt-1 md:pb-4">
                                &nbsp;
                                {titles.map((title, index) => (
                                    <motion.div
                                        key={index}
                                        className="absolute font-light"
                                        initial={{ opacity: 0, y: "-100" }}
                                        transition={{ type: "spring", stiffness: 50 }}
                                        animate={
                                            titleNumber === index
                                                ? {
                                                    y: 0,
                                                    opacity: 1,
                                                }
                                                : {
                                                    y: titleNumber > index ? -150 : 150,
                                                    opacity: 0,
                                                }
                                        }
                                    >
                                        {title}
                                    </motion.div>
                                ))}
                            </span>
                        </h1>

                        <p className="text-muted-foreground max-w-2xl text-center text-lg leading-relaxed tracking-tight md:text-xl">
                            Preparing for exams is already challenging enough. <br />
                            Avoid further complications by ditching outdated study methods.
                        </p>
                    </div>

                    {!isLoading && (
                        <div className="flex flex-row gap-3">
                            {isLoggedIn ? (
                                <Button
                                    onClick={handleDashboardClick}
                                    size="lg"
                                    variant="neobrutalist"
                                    className="gap-4"
                                >
                                    Go to Dashboard <ArrowRightIcon className="size-4" />
                                </Button>
                            ) : (
                                <>
                                    <Link href="/auth/login">
                                        <Button
                                            size="lg"
                                            variant="neobrutalist"
                                            className="gap-4"
                                        >
                                            Start Learning <BookOpenIcon className="size-4" />
                                        </Button>
                                    </Link>
                                    <Link href="/auth/login">
                                        <Button
                                            size="lg"
                                            variant="neobrutalistInverted"
                                            className="gap-4"
                                        >
                                            Login{" "}
                                            <StarIcon className="size-4" />
                                        </Button>
                                    </Link>
                                </>
                            )}
                        </div>
                    )}

                    <div className="flex flex-row gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex -space-x-3">
                                {testimonials.map((testimonial, idx) => (
                                    <div
                                        key={idx}
                                        className="relative h-10 w-10 rounded-full border-3 border-background transition-all duration-300 hover:scale-125 hover:cursor-pointer hover:z-10 overflow-hidden"
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
                            <p className="text-muted-foreground text-sm font-bold">
                                Trusted by 10,000+ students
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
