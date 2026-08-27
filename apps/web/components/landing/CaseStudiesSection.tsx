"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface CaseStudy {
  id: number;
  text: string;
  link: string;
}

const cases: CaseStudy[] = [
  {
    id: 1,
    text: "For a national banking aspirant community, we implemented a targeted speed practice drill engine that resulted in a 45% increase in sectional cutoff clearance rates.",
    link: "/dashboard/sectional-tests",
  },
  {
    id: 2,
    text: "For an exam preparation institute, we developed an AI-assisted diagnostic evaluation system that improved student mock test score percentiles by an average of 18 points.",
    link: "/dashboard/full-mock-tests",
  },
  {
    id: 3,
    text: "For top rankers targeting SBI PO and RBI Grade B, our event-driven analytics pipeline delivered question-level latency stats, boosting overall exam-day time efficiency by 30%.",
    link: "/analytics",
  },
];

export default function CaseStudiesSection() {
  return (
    <section id="use-cases" className="py-16 md:py-24 bg-background scroll-mt-28">
      <div className="container mx-auto px-4 md:px-12">
        {/* Positivus Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 mb-16">
          <div className="px-3 py-1 bg-[#B9FF66] text-[#191A23] text-3xl md:text-4xl font-medium rounded-[7px] border-2 border-[#191A23] font-heading shrink-0 shadow-[2px_2px_0px_0px_#191A23]">
            Case Studies
          </div>
          <p className="text-[#191A23]/80 dark:text-white/80 text-base md:text-lg max-w-xl font-normal leading-relaxed font-heading">
            Explore Real-Life Examples of Our Proven Exam Preparation Success through Our Candidate Case Studies.
          </p>
        </div>

        {/* 3-Column Dark Container */}
        <div className="rounded-[35px] md:rounded-[45px] bg-[#191A23] text-white p-8 md:p-14 border-2 border-[#191A23] shadow-[0px_6px_0px_0px_#191A23] dark:shadow-[0px_6px_0px_0px_#000]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-0 lg:divide-x-2 lg:divide-white/20">
            {cases.map((item, idx) => (
              <div
                key={item.id}
                className={`flex flex-col justify-between space-y-6 ${
                  idx === 0 ? "lg:pr-10" : idx === 1 ? "lg:px-10" : "lg:pl-10"
                }`}
              >
                <p className="text-base md:text-lg font-normal text-white/85 leading-relaxed">
                  {item.text}
                </p>
                <div>
                  <Link
                    href={item.link}
                    className="inline-flex items-center gap-2 text-[#B9FF66] font-medium text-base md:text-lg hover:underline underline-offset-4 group"
                  >
                    <span>Learn more</span>
                    <ArrowUpRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-[-0.5px]" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
