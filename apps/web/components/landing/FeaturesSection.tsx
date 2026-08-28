"use client";

import Image from "next/image";
import Link from "next/link";

const cards = [
  {
    index: 1,
    titleTop: "Search Engine",
    titleBottom: "Optimization",
    img: "/figma/service-seo.svg",
    alt: "SEO",
    link: "/dashboard/sectional-tests",
  },
  {
    index: 2,
    titleTop: "Pay-per-click",
    titleBottom: "advertising",
    img: "/figma/service-ppc.svg",
    alt: "PPC",
    link: "/dashboard/full-mock-tests",
  },
  {
    index: 3,
    titleTop: "Social Media",
    titleBottom: "Marketing",
    img: "/figma/service-social.svg",
    alt: "Social",
    link: "/dashboard/flash-cards",
  },
  {
    index: 1,
    titleTop: "Email",
    titleBottom: "Marketing",
    img: "/figma/service-email.svg",
    alt: "Email",
    link: "/dashboard",
  },
  {
    index: 2,
    titleTop: "Content",
    titleBottom: "Creation",
    img: "/figma/service-content.svg",
    alt: "Content",
    link: "/analytics",
  },
  {
    index: 3,
    titleTop: "Analytics and",
    titleBottom: "Tracking",
    img: "/figma/service-analytics.svg",
    alt: "Analytics",
    link: "/dashboard",
  },
];

const description =
  "At our digital marketing agency, we offer a range of services to help businesses grow and succeed online. These services include:";

export default function FeaturesSection() {
  return (
    <section id="services" className="w-full max-w-[1240px] mx-auto px-6 md:px-8 scroll-mt-28">
      <div className="mt-[80px] md:mt-[140px] mb-5">
        <div className="flex flex-col items-center gap-10 mb-20 sm:flex-row">
          <h2 className="greenhead text-center sm:text-left text-3xl sm:text-4xl">Services</h2>
          <p className="w-auto text-center sm:text-left sm:w-[580px]">{description}</p>
        </div>
        <div className="grid lg:grid-cols-2 lg:grid-rows-3 gap-10">
          {cards.map((card) => {
            const bg = card.index === 1 ? "bg-gray" : card.index === 2 ? "bg-green" : "bg-dark";
            const textColor = card.index === 3 ? "text-white" : "text-black";
            return (
              <div key={card.titleTop} className="rounded-[45px] border border-dark shadow-[0px_5px_0px_#191a23]">
                <div className={`h-[300px] w-full sm:h-full lg:gap-[60px] grid custom-grid lg:grid-cols-2 lg:grid-rows-1 p-8 sm:p-[50px] rounded-[45px] ${bg} ${textColor}`}>
                  <h3 className="flex flex-col col-span-2 lg:col-span-1 font-medium text-2xl leading-tight">
                    <span className={`w-[fit-content] ${card.index === 1 ? "greenhead" : "whitehead"}`}>{card.titleTop}</span>
                    <span className={`w-[fit-content] ${card.index === 1 ? "greenhead" : "whitehead"}`}>{card.titleBottom}</span>
                  </h3>
                  <div className="w-full h-full row-span-1 order-1 lg:order-none lg:row-span-2 flex justify-center items-center">
                    <Image src={card.img} alt={card.alt} width={210} height={170} className="h-[100px] w-auto sm:h-auto sm:w-3/4 object-contain" />
                  </div>
                  <div className="flex items-end">
                    <Link href={card.link} className="flex items-center gap-3.5">
                      <span className={`h-10 w-10 rounded-full flex items-center justify-center ${card.index === 3 ? "bg-white text-black" : "bg-dark text-white"}`}>
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10H15M15 10L10 5M15 10L10 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                      <span className={`hidden sm:block font-medium ${card.index === 3 ? "text-white" : "text-black"}`}>Learn more</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`.custom-grid { grid-template: auto auto; }`}</style>
    </section>
  );
}
