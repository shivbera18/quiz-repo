"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

interface ServiceCard {
  id: string;
  titleLine1: string;
  titleLine2: string;
  theme: "grey" | "green" | "dark";
  imageSrc: string;
  href: string;
}

const services: ServiceCard[] = [
  {
    id: "seo",
    titleLine1: "Search engine",
    titleLine2: "optimization",
    theme: "grey",
    imageSrc: "/figma/service-seo.svg",
    href: "/dashboard/sectional-tests",
  },
  {
    id: "ppc",
    titleLine1: "Pay-per-click",
    titleLine2: "advertising",
    theme: "green",
    imageSrc: "/figma/service-ppc.svg",
    href: "/dashboard/full-mock-tests",
  },
  {
    id: "social",
    titleLine1: "Social Media",
    titleLine2: "Marketing",
    theme: "dark",
    imageSrc: "/figma/service-social.svg",
    href: "/dashboard/flash-cards",
  },
  {
    id: "email",
    titleLine1: "Email",
    titleLine2: "Marketing",
    theme: "grey",
    imageSrc: "/figma/service-email.svg",
    href: "/dashboard",
  },
  {
    id: "content",
    titleLine1: "Content",
    titleLine2: "Creation",
    theme: "green",
    imageSrc: "/figma/service-content.svg",
    href: "/analytics",
  },
  {
    id: "analytics",
    titleLine1: "Analytics and",
    titleLine2: "Tracking",
    theme: "dark",
    imageSrc: "/figma/service-analytics.svg",
    href: "/dashboard",
  },
];

export default function FeaturesSection() {
  return (
    <section id="services" className="py-16 md:py-24 bg-background">
      <div className="container mx-auto px-4 md:px-12">
        {/* Positivus Section Header from Figma */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 mb-16">
          <div className="px-3 py-1 bg-[#B9FF66] text-[#191A23] text-3xl md:text-4xl font-medium rounded-[7px] border-2 border-[#191A23] font-heading shrink-0 shadow-[2px_2px_0px_0px_#191A23]">
            Services
          </div>
          <p className="text-[#191A23]/80 dark:text-white/80 text-base md:text-lg max-w-xl font-normal leading-relaxed font-heading">
            At our digital marketing agency, we offer a range of services to help businesses grow and succeed online. These services include:
          </p>
        </div>

        {/* 6-Card Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
          {services.map((service, idx) => {
            // Style mapping for Positivus 3-theme cards
            const cardStyles = {
              grey: {
                cardBg: "bg-[#F3F3F3] dark:bg-[#1E1F2A] border-[#191A23] dark:border-white/30 text-[#191A23] dark:text-white",
                badgeBg: "bg-[#B9FF66] text-[#191A23]",
                arrowCircle: "bg-[#191A23] text-[#B9FF66] group-hover:bg-[#B9FF66] group-hover:text-[#191A23]",
                linkText: "text-[#191A23] dark:text-white",
              },
              green: {
                cardBg: "bg-[#B9FF66] border-[#191A23] text-[#191A23]",
                badgeBg: "bg-white text-[#191A23]",
                arrowCircle: "bg-[#191A23] text-[#B9FF66] group-hover:bg-white group-hover:text-[#191A23]",
                linkText: "text-[#191A23]",
              },
              dark: {
                cardBg: "bg-[#191A23] border-[#191A23] dark:border-white/30 text-white",
                badgeBg: service.id === "analytics" ? "bg-[#B9FF66] text-[#191A23]" : "bg-white text-[#191A23]",
                arrowCircle: "bg-white text-[#191A23] group-hover:bg-[#B9FF66] group-hover:text-[#191A23]",
                linkText: "text-white",
              },
            }[service.theme];

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`group relative rounded-[35px] md:rounded-[45px] p-8 md:p-12 border-2 shadow-[0px_5px_0px_0px_#191A23] dark:shadow-[0px_5px_0px_0px_#000] flex flex-col justify-between min-h-[300px] transition-all hover:translate-y-[-2px] ${cardStyles.cardBg}`}
              >
                <div className="grid grid-cols-12 gap-4 items-center h-full">
                  {/* Left Side: Title & Learn more */}
                  <div className="col-span-7 flex flex-col justify-between h-full space-y-8">
                    <div className="space-y-1">
                      <span className={`inline-block px-2.5 py-1 text-2xl lg:text-3xl font-medium rounded-[7px] border border-[#191A23] font-heading leading-tight ${cardStyles.badgeBg}`}>
                        {service.titleLine1}
                      </span>
                      <br />
                      <span className={`inline-block px-2.5 py-1 text-2xl lg:text-3xl font-medium rounded-[7px] border border-[#191A23] font-heading leading-tight ${cardStyles.badgeBg}`}>
                        {service.titleLine2}
                      </span>
                    </div>

                    <Link href={service.href} className="inline-flex items-center gap-3.5 font-normal text-lg md:text-xl group/link pt-4">
                      <div className={`h-10 w-10 md:h-11 md:w-11 rounded-full border border-[#191A23] flex items-center justify-center transition-all ${cardStyles.arrowCircle}`}>
                        <ArrowUpRight className="h-5 w-5 transition-transform group-hover/link:translate-x-0.5 group-hover/link:translate-y-[-0.5px]" />
                      </div>
                      <span className={`hidden sm:inline font-normal hover:underline underline-offset-4 ${cardStyles.linkText}`}>
                        Learn more
                      </span>
                    </Link>
                  </div>

                  {/* Right Side: Exact Figma Service SVG Illustration */}
                  <div className="col-span-5 flex justify-end items-center">
                    <div className="relative w-full max-w-[210px] aspect-[4/3] flex items-center justify-center">
                      <Image
                        src={service.imageSrc}
                        alt={service.titleLine1}
                        width={210}
                        height={170}
                        className="w-full h-auto object-contain select-none pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
