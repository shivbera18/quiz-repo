"use client";

import Image from "next/image";

const team = [
  { name: "John Smith", role: "CEO and Founder", bio: "10+ years in digital marketing. SEO, PPC, content.", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=faces" },
  { name: "Jane Doe", role: "Director of Operations", bio: "7+ years in PM and team leadership.", img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=faces" },
  { name: "Michael Brown", role: "Senior SEO Specialist", bio: "5+ years SEO and content.", img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=faces" },
  { name: "Emily Johnson", role: "PPC Manager", bio: "3+ years paid search.", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces" },
  { name: "Brian Williams", role: "Social Media Specialist", bio: "4+ years social.", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=faces" },
  { name: "Sarah Kim", role: "Content Creator", bio: "2+ years writing.", img: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=faces" },
];

export default function TeamSection() {
  return (
    <section id="team" className="w-full max-w-[1240px] mx-auto px-6 scroll-mt-28">
      <div className="mt-16">
        <div className="text-xs font-mono text-primary mb-4">● team</div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Team</h2>
        <p className="text-muted-foreground mt-2">Skilled team behind successful strategies.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {team.map(m => (
            <div key={m.name} className="glass rounded-lg p-6">
              <div className="flex gap-4">
                <Image src={m.img} alt={m.name} width={56} height={56} className="h-14 w-14 rounded-full object-cover" />
                <div>
                  <div className="font-medium">{m.name}</div>
                  <div className="text-xs font-mono text-primary">{m.role}</div>
                </div>
              </div>
              <div className="h-px bg-white/10 my-4" />
              <p className="text-sm text-muted-foreground">{m.bio}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
