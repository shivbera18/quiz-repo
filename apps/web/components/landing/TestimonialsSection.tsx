"use client";

const testimonials = [
  {
    name: "John Smith",
    role: "CEO at Example Corp",
    text: "\"We have been working with Positivus for the past year and have seen a significant increase in website traffic and leads as a result of their efforts. The team is professional, responsive, and truly cares about the success of our business.\"",
  },
  {
    name: "Jane Doe",
    role: "Marketing Director at ABC Ltd",
    text: "\"Positivus helped us to increase our online visibility and drive more traffic to our website. Their expertise in SEO and content creation is outstanding. Highly recommended!\"",
  },
  {
    name: "Michael Brown",
    role: "Founder at StartupX",
    text: "\"The team at Positivus is amazing! They delivered beyond our expectations and helped us achieve top rankings. Great communication and results-driven approach.\"",
  },
];

export default function TestimonialsSection() {
  return (
    <section id="testimonials" className="w-full max-w-[1240px] mx-auto px-6 md:px-8 scroll-mt-28">
      <div className="mt-20">
        <div className="flex flex-col items-center gap-10 mb-20 sm:flex-row">
          <h2 className="greenhead text-center sm:text-left text-3xl sm:text-4xl">Testimonials</h2>
          <p className="w-auto text-center sm:text-left sm:w-[580px]">Hear from Our Satisfied Clients: Read Our Testimonials to Learn More about Our Digital Marketing Services</p>
        </div>
        <div className="rounded-[45px] bg-dark mb-[100px] md:mb-[150px] text-gray p-[30px] md:p-[60px]">
          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, idx) => (
              <div key={idx} className="border border-green rounded-[20px] p-6 relative">
                <p className="text-white text-sm leading-relaxed">{t.text}</p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green" />
                  <div>
                    <div className="text-green font-medium text-sm">{t.name}</div>
                    <div className="text-white text-xs">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
