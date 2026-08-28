"use client";

import Image from "next/image";
import Link from "next/link";

const team = [
  {
    pic: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces",
    name: "John Smith",
    role: "CEO and Founder",
    description: "10+ years of experience in digital marketing. Expertise in SEO, PPC, and content strategy",
    link: "#",
  },
  {
    pic: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces",
    name: "Jane Doe",
    role: "Director of Operations",
    description: "7+ years of experience in project management and team leadership. Strong organizational and communication skills",
    link: "#",
  },
  {
    pic: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces",
    name: "Michael Brown",
    role: "Senior SEO Specialist",
    description: "5+ years of experience in SEO and content creation. Proficient in keyword research and on-page optimization",
    link: "#",
  },
  {
    pic: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces",
    name: "Emily Johnson",
    role: "PPC Manager",
    description: "3+ years of experience in paid search advertising. Skilled in campaign management and performance analysis",
    link: "#",
  },
  {
    pic: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces",
    name: "Brian Williams",
    role: "Social Media Specialist",
    description: "4+ years of experience in social media marketing. Proficient in creating and scheduling content, analyzing metrics",
    link: "#",
  },
  {
    pic: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces",
    name: "Sarah Kim",
    role: "Content Creator",
    description: "2+ years of experience in writing and editing. Skilled in creating compelling, SEO-optimized content for various industries",
    link: "#",
  },
];

export default function TeamSection() {
  return (
    <section id="team" className="w-full max-w-[1240px] mx-auto px-6 md:px-8 scroll-mt-28">
      <div className="mt-[140px]">
        <div className="flex flex-col items-center gap-10 mb-20 sm:flex-row">
          <h2 className="greenhead text-center sm:text-left text-3xl sm:text-4xl">Team</h2>
          <p className="w-auto text-center sm:text-left sm:w-[580px]">Meet the skilled and experienced team behind our successful digital marketing strategies</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
          {team.map((member, idx) => (
            <div key={idx} className="rounded-[45px] border border-dark shadow-[0px_5px_0px_#191a23]">
              <div className="p-[40px] sm:p-[60px]">
                <div className="flex flex-col sm:flex-row relative">
                  <div className="h-20 w-20 rounded-full overflow-hidden shrink-0">
                    <Image src={member.pic} alt={member.name} width={80} height={80} className="object-cover w-full h-full" />
                  </div>
                  <div className="flex flex-col justify-end sm:ml-5 mt-4 sm:mt-0">
                    <h3 className="text-lg font-medium">{member.name}</h3>
                    <p className="text-sm font-normal">{member.role}</p>
                  </div>
                  <a href={member.link} className="absolute right-0 top-0 h-8 w-8 rounded-full bg-dark text-green flex items-center justify-center text-xs font-bold">in</a>
                </div>
                <div className="w-full h-[1px] bg-black my-7" />
                <div className="text-sm">{member.description}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-10">
          <Link href="#contact" className="btn-primary">See all team</Link>
        </div>
      </div>
    </section>
  );
}
