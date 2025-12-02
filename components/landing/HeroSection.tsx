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

interface Testimonial {
    name: string;
    initial: string;
}

const testimonials: Testimonial[] = [
    { name: "Student 1", initial: "A" },
    { name: "Student 2", initial: "B" },
    { name: "Student 3", initial: "C" },
    { name: "Student 4", initial: "D" },
    { name: "Student 5", initial: "E" },
    { name: "Student 6", initial: "F" },
    { name: "Student 7", initial: "G" },
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
                router.push("/login");
            }
        } else {
            router.push("/login");
        }
    };

    return (
        <div className="w-full pt-20">
            <div className="container mx-auto">
                <div className="relative flex flex-col items-center justify-center gap-8 py-10 lg:py-20">
                    <Science className="absolute top-4 left-4 size-24 md:size-64 text-foreground opacity-20" />
                    <Cap className="absolute right-10 -bottom-16 size-24 md:bottom-10 md:size-64 lg:bottom-0 text-foreground opacity-20" />
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
                                    <Link href="/register">
                                        <Button
                                            size="lg"
                                            variant="neobrutalist"
                                            className="gap-4"
                                        >
                                            Start Learning <BookOpenIcon className="size-4" />
                                        </Button>
                                    </Link>
                                    <Link href="/login">
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
                        <div className="flex items-center gap-2">
                            <div className="flex -space-x-2">
                                {testimonials.map((testimonial, idx) => (
                                    <div
                                        key={idx}
                                        className="h-8 w-8 rounded-full border-2 border-white bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs font-bold transition-all duration-300 hover:scale-150 hover:cursor-pointer hover:z-10"
                                    >
                                        {testimonial.initial}
                                    </div>
                                ))}
                            </div>
                            <p className="text-muted-foreground text-sm font-medium">
                                Trusted by 10,000+ students
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
