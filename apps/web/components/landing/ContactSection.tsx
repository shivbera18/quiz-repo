"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export default function ContactSection() {
  const [topic, setTopic] = useState<"hi" | "quote">("hi");
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setSubmitted(true);
  };

  return (
    <section id="contact" className="py-16 md:py-24 bg-background scroll-mt-28">
      <div className="container mx-auto px-4 md:px-12">
        {/* Positivus Section Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-10 mb-16">
          <div className="px-3 py-1 bg-[#B9FF66] text-[#191A23] text-3xl md:text-4xl font-medium rounded-[7px] border-2 border-[#191A23] font-heading shrink-0 shadow-[2px_2px_0px_0px_#191A23]">
            Contact Us
          </div>
          <p className="text-[#191A23]/80 dark:text-white/80 text-base md:text-lg max-w-xl font-normal leading-relaxed font-heading">
            Connect with Us: Let&apos;s Discuss Your Preparation Goals and Platform Needs.
          </p>
        </div>

        {/* Contact Container with Form + Right Illustration */}
        <div className="rounded-[35px] md:rounded-[45px] bg-[#F3F3F3] dark:bg-[#1E1F2A] border-2 border-[#191A23] dark:border-white/30 shadow-[0px_6px_0px_0px_#191A23] dark:shadow-[0px_6px_0px_0px_#000] p-8 sm:p-12 md:p-16 relative overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Form */}
            <div className="lg:col-span-7">
              {submitted ? (
                <div className="space-y-4 py-8">
                  <div className="h-14 w-14 rounded-full bg-[#B9FF66] border-2 border-[#191A23] flex items-center justify-center font-bold text-2xl text-[#191A23]">
                    ✓
                  </div>
                  <h3 className="text-2xl font-bold text-foreground font-heading">
                    Thank you for reaching out!
                  </h3>
                  <p className="text-muted-foreground text-base">
                    Our preparation advisory team has received your message and will get back to you within 24 hours.
                  </p>
                  <Button
                    variant="positivusDark"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: "", email: "", message: "" });
                    }}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Radio Choice (Say Hi / Get a Quote) */}
                  <div className="flex flex-wrap items-center gap-6 sm:gap-10">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="radio"
                          name="topic"
                          checked={topic === "hi"}
                          onChange={() => setTopic("hi")}
                          className="sr-only"
                        />
                        <div
                          className={`h-6 w-6 rounded-full border-2 border-[#191A23] flex items-center justify-center transition-all ${
                            topic === "hi" ? "bg-white" : "bg-transparent"
                          }`}
                        >
                          {topic === "hi" && (
                            <div className="h-3 w-3 rounded-full bg-[#B9FF66] border border-[#191A23]" />
                          )}
                        </div>
                      </div>
                      <span className="font-medium text-base text-foreground font-heading">Say Hi</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div className="relative flex items-center justify-center">
                        <input
                          type="radio"
                          name="topic"
                          checked={topic === "quote"}
                          onChange={() => setTopic("quote")}
                          className="sr-only"
                        />
                        <div
                          className={`h-6 w-6 rounded-full border-2 border-[#191A23] flex items-center justify-center transition-all ${
                            topic === "quote" ? "bg-white" : "bg-transparent"
                          }`}
                        >
                          {topic === "quote" && (
                            <div className="h-3 w-3 rounded-full bg-[#B9FF66] border border-[#191A23]" />
                          )}
                        </div>
                      </div>
                      <span className="font-medium text-base text-foreground font-heading">Get a Quote</span>
                    </label>
                  </div>

                  {/* Inputs */}
                  <div className="space-y-2">
                    <label htmlFor="contact-name" className="block text-sm font-bold text-foreground">
                      Name *
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      placeholder="Name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full h-14 px-6 rounded-[14px] border-2 border-[#191A23] bg-white text-[#191A23] placeholder:text-[#191A23]/50 text-base focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="contact-email" className="block text-sm font-bold text-foreground">
                      Email *
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="Email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full h-14 px-6 rounded-[14px] border-2 border-[#191A23] bg-white text-[#191A23] placeholder:text-[#191A23]/50 text-base focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="contact-message" className="block text-sm font-bold text-foreground">
                      Message *
                    </label>
                    <textarea
                      id="contact-message"
                      rows={4}
                      required
                      placeholder="Message"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      className="w-full p-6 rounded-[14px] border-2 border-[#191A23] bg-white text-[#191A23] placeholder:text-[#191A23]/50 text-base focus:outline-none focus:ring-2 focus:ring-[#B9FF66]"
                    />
                  </div>

                  <Button
                    type="submit"
                    variant="positivusDark"
                    className="w-full h-14 text-base md:text-lg font-bold rounded-[14px]"
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </div>

            {/* Right Graphic */}
            <div className="lg:col-span-5 hidden lg:flex justify-center items-center">
              <div className="relative w-full max-w-[340px] aspect-square flex items-center justify-center">
                <Image
                  src="/figma/cta-illustration.svg"
                  alt="Contact illustration"
                  width={340}
                  height={340}
                  className="w-full h-auto object-contain select-none pointer-events-none opacity-90"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
