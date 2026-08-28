"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface TeamMember {
  name: string;
  role: string;
  experience: string;
  avatar: string;
  linkedin: string;
}

const team: TeamMember[] = [
  {
    name: "Shiv Choudhary",
    role: "Lead Platform Engineer & Founder",
    experience: "5+ years in full-stack architecture, distributed systems, and modern AI testing engines.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
    linkedin: "https://github.com/shivbera18",
  },
  {
    name: "Aarav Sharma",
    role: "Head of Content & Exam Strategy",
    experience: "Ex-SBI PO top scorer with 7+ years mentoring 20,000+ candidates for banking examinations.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
    linkedin: "#",
  },
  {
    name: "Rhea Sen",
    role: "Senior Reasoning Specialist",
    experience: "Expert in complex analytical puzzles, critical reasoning algorithms, and syllabus curriculum.",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
    linkedin: "#",
  },
  {
    name: "Devendra Verma",
    role: "Quantitative Aptitude Lead",
    experience: "Specialist in high-speed arithmetic shortcuts, data interpretation, and quantitative speed drills.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
    linkedin: "#",
  },
  {
    name: "Kavita Reddy",
    role: "English Language & Verbal Faculty",
    experience: "MA in English Linguistics with 8+ years developing reading comprehension and vocabulary benchmarks.",
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=faces",
    linkedin: "#",
  },
  {
    name: "Nikhil Joshi",
    role: "AI & Analytics Engineer",
    experience: "Designs adaptive question recommendation models, latency metrics, and real-time rank pipelines.",
    avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces",
    linkedin: "#",
  },
];

export default function TeamSection() {
  return (
    <section id="team" className="py-16 md:py-24 bg-background scroll-mt-28">
      <div className="container mx-auto px-4 md:px-12">
        {/* Positivus Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 mb-16">
          <div className="px-3 py-1 bg-[#B9FF66] text-[#191A23] text-3xl md:text-4xl font-medium rounded-[7px] border-2 border-[#191A23] font-heading shrink-0 shadow-[2px_2px_0px_0px_#191A23]">
            Team
          </div>
          <p className="text-[#191A23]/80 dark:text-white/80 text-base md:text-lg max-w-xl font-normal leading-relaxed font-heading">
            Meet the skilled educators and engineers behind our top-ranking exam preparation platform.
          </p>
        </div>

        {/* 6-Card Team Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {team.map((member, idx) => (
            <div
              key={idx}
              className="rounded-[35px] md:rounded-[45px] p-8 md:p-10 border-2 border-[#191A23] dark:border-white/30 bg-[#FFFFFF] dark:bg-[#1E1F2A] shadow-[0px_5px_0px_0px_#191A23] dark:shadow-[0px_5px_0px_0px_#000] flex flex-col justify-between transition-all hover:translate-y-[-2px]"
            >
              <div>
                <div className="flex items-start justify-between gap-4 relative">
                  <div className="flex items-center gap-4">
                    <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-[#191A23] shrink-0">
                      <Image
                        src={member.avatar}
                        alt={member.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg md:text-xl font-bold text-[#191A23] dark:text-white font-heading">
                        {member.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                        {member.role}
                      </p>
                    </div>
                  </div>

                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} LinkedIn`}
                    className="h-9 w-9 rounded-full bg-[#191A23] text-[#B9FF66] flex items-center justify-center font-bold text-xs shrink-0 hover:scale-105 transition-transform"
                  >
                    in
                  </a>
                </div>

                <div className="w-full h-[1px] bg-[#191A23]/20 dark:bg-white/20 my-6" />

                <p className="text-sm text-[#191A23]/80 dark:text-white/80 leading-relaxed font-normal">
                  {member.experience}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Team CTA */}
        <div className="flex justify-end mt-10">
          <a href="#contact">
            <Button
              variant="positivusDark"
              size="lg"
              className="text-base font-medium px-8 py-5"
            >
              Contact our team
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
