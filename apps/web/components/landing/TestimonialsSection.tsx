"use client";

const items = [
  { q: "We have been working with Positivus for the past year and have seen a significant increase in website traffic.", n: "John Smith", r: "CEO at Example" },
  { q: "Positivus helped us increase online visibility — outstanding SEO and content.", n: "Jane Doe", r: "Marketing Director" },
  { q: "Delivered beyond expectations and helped us achieve top rankings.", n: "Michael Brown", r: "Founder at StartupX" },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="w-full max-w-[1240px] mx-auto px-6 scroll-mt-28">
      <div className="mt-16">
        <div className="text-xs font-mono text-primary mb-4">● testimonials</div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Testimonials</h2>
        <p className="text-muted-foreground mt-2">Hear from satisfied clients.</p>
        <div className="glass rounded-lg p-8 mt-10 grid md:grid-cols-3 gap-6">
          {items.map(i => (
            <div key={i.n} className="rounded-lg border border-white/10 bg-white/[0.02] p-6">
              <p className="text-sm text-muted-foreground leading-relaxed">“{i.q}”</p>
              <div className="mt-4">
                <div className="text-sm font-medium">{i.n}</div>
                <div className="text-xs font-mono text-primary">{i.r}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
