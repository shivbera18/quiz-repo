"use client";

import { useState } from "react";

const steps = [
  {
    index: "01",
    title: "Consultation",
    description: "During the initial consultation, we will discuss your business goals and objectives, target audience, and current marketing efforts. This will allow us to understand your needs and tailor our services to best fit your requirements.",
  },
  {
    index: "02",
    title: "Research and Strategy Development",
    description: "After consultation, we conduct thorough research to identify your target audience, competitors, and industry trends to craft a data-driven strategy.",
  },
  {
    index: "03",
    title: "Implementation",
    description: "Once research is complete, we begin implementing the strategy. This may include optimizing your website, creating content, and launching campaigns.",
  },
  {
    index: "04",
    title: "Monitoring and Optimization",
    description: "After initial implementation, we continuously monitor and optimize your marketing efforts to ensure maximum performance and ROI.",
  },
  {
    index: "05",
    title: "Reporting and Communication",
    description: "Throughout the process, we provide regular reports on campaign performance and maintain transparent communication.",
  },
  {
    index: "06",
    title: "Continual Improvement",
    description: "Based on data and insights gathered, we make recommendations for further improvement and scale what works best.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="process" className="w-full max-w-[1240px] mx-auto px-6 md:px-8 scroll-mt-28">
      <div className="mt-[140px]">
        <div className="flex flex-col items-center gap-10 mb-20 sm:flex-row">
          <h2 className="greenhead text-center sm:text-left text-3xl sm:text-4xl">Our Working Process</h2>
          <p className="w-auto text-center sm:text-left sm:w-[580px]">Step-by-Step Guide to Achieving Your Business Goals</p>
        </div>
        <div>
          {steps.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={item.index}
                className={`accordion__item group overflow-hidden w-full transition-all duration-500 mb-[30px] rounded-[45px] border border-dark shadow-[0px_5px_0px_#191a23] ${isOpen ? "bg-green" : "bg-gray"} ${isOpen ? "h-auto" : "h-[160px]"}`}
              >
                <button
                  className="accordion__toggle w-full h-[160px] flex items-center justify-between p-[30px] sm:p-[60px] cursor-pointer"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                >
                  <div className="flex items-center gap-[25px]">
                    <span className="text-3xl sm:text-5xl font-medium">{item.index}</span>
                    <h3 className="text-lg sm:text-2xl font-medium text-left">{item.title}</h3>
                  </div>
                  <div className={`accordion__icon relative w-[50px] h-[50px] rounded-full border border-dark bg-white flex items-center justify-center shrink-0 ${isOpen ? "" : "collapsed"}`}>
                    <span className="sr-only">Toggle</span>
                  </div>
                </button>
                <div className={`px-[30px] sm:px-[60px] pb-[30px] ${isOpen ? "block" : "hidden"}`}>
                  <div className="h-[1px] bg-black mb-[30px]" />
                  <p>{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        .accordion__icon::before,
        .accordion__icon::after {
          content: "";
          position: absolute;
          background-color: black;
          transition: opacity 0.3s ease;
        }
        .accordion__icon::before {
          width: 100%;
          height: 6px;
          left: 0;
          top: calc(50% - 3px);
        }
        .accordion__icon::after {
          width: 6px;
          height: 100%;
          left: calc(50% - 3px);
          top: 0;
        }
        .accordion__icon.collapsed::after {
          opacity: 0;
        }
      `}</style>
    </section>
  );
}
