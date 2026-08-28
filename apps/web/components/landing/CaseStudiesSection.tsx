"use client";

import Link from "next/link";

const cases = [
  {
    text: "For a local restaurant, we implemented a targeted PPC campaign that resulted in a 50% increase in website traffic and a 25% increase in sales.",
    link: "/dashboard/sectional-tests",
  },
  {
    text: "For a B2B software company, we developed an SEO strategy that resulted in a first page ranking for key keywords and a 200% increase in organic traffic.",
    link: "/dashboard/full-mock-tests",
  },
  {
    text: "For a national retail chain, we created a social media marketing campaign that increased followers by 25% and generated a 20% increase in online sales.",
    link: "/analytics",
  },
];

export default function CaseStudiesSection() {
  return (
    <section id="use-cases" className="w-full max-w-[1240px] mx-auto px-6 md:px-8 scroll-mt-28">
      <div className="flex flex-col items-center gap-10 mb-20 sm:flex-row mt-[80px] md:mt-[140px]">
        <h2 className="greenhead text-center sm:text-left text-3xl sm:text-4xl">Case Studies</h2>
        <p className="w-auto text-center sm:text-left sm:w-[580px]">Explore Real-Life Examples of Our Proven Digital Marketing Success through Our Case Studies</p>
      </div>
      <div className="flex flex-col lg:flex-row justify-between rounded-[45px] p-1 bg-dark">
        {cases.map((card, idx) => (
          <div key={idx} className="flex p-[60px] h-full bg-dark text-gray rounded-[45px] m-[1px] flex-1">
            <div className="flex flex-col gap-5 justify-between">
              <p className="text-white">{card.text}</p>
              <Link href={card.link} className="flex items-center gap-[15px]">
                <span className="text-green">Learn more</span>
                <span className="h-6 w-6 rounded-full bg-white text-dark flex items-center justify-center">↗</span>
              </Link>
            </div>
            {idx < cases.length - 1 && <div className="hidden lg:block w-[1px] bg-white/20 mx-2" />}
          </div>
        ))}
      </div>
    </section>
  );
}
