"use client";

import Image from "next/image";
import Link from "next/link";

export default function CTASection() {
  return (
    <section className="w-full max-w-[1240px] mx-auto px-6 md:px-8">
      <div className="rounded-[45px] border border-dark shadow-[0px_5px_0px_#191a23]">
        <div className="flex bg-gray rounded-[45px] p-[60px] relative mt-[80px] md:mt-[123px] mb-[80px] md:mb-[163px]">
          <div className="w-full md:w-[40%] flex flex-col gap-[26px]">
            <h2 className="text-3xl font-medium font-grotesk">Let&apos;s make things happen</h2>
            <p>Contact us today to learn more about how our digital marketing services can help your business grow and succeed online.</p>
            <Link href="/auth/signup" className="btn-primary text-center">Get your free proposal</Link>
          </div>
          <div className="hidden md:flex absolute right-[-6%] lg:right-0 top-[-15%] h-[400px] lg:h-[450px] items-center justify-center">
            <Image src="/figma/cta-illustration.svg" alt="Proposal illustration" width={494} height={395} className="hidden md:flex lg:h-full lg:w-auto object-contain" />
          </div>
        </div>
      </div>
    </section>
  );
}
