"use client";

import { useState } from "react";
import Image from "next/image";

export default function ContactSection() {
  const [topic, setTopic] = useState<"hi" | "quote">("hi");
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setSubmitted(true);
  };

  return (
    <section id="contact" className="w-full max-w-[1240px] mx-auto px-6 md:px-8 scroll-mt-28">
      <div className="mt-[80px] md:mt-[140px] relative">
        <div className="flex flex-col items-center gap-10 mb-20 sm:flex-row">
          <h2 className="greenhead text-center sm:text-left text-3xl sm:text-4xl">Contact Us</h2>
          <p className="w-auto text-center sm:text-left sm:w-[580px]">Connect with Us: Let&apos;s Discuss Your Digital Marketing Needs</p>
        </div>
        <div className="flex relative justify-start items-center p-[30px] md:p-[60px] bg-gray rounded-[45px] overflow-hidden">
          {submitted ? (
            <div className="h-full w-full lg:max-w-lg py-12 space-y-4">
              <div className="h-14 w-14 rounded-full bg-green border border-dark flex items-center justify-center font-bold text-2xl">✓</div>
              <h3 className="text-2xl font-medium">Thank you!</h3>
              <p>Your message has been received. We will get back to you soon.</p>
              <button onClick={() => { setSubmitted(false); setFormData({ name: "", email: "", message: "" }); }} className="btn-primary">Send another</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-gray sm:p-6 h-full w-full lg:max-w-lg space-y-6">
              <div className="flex flex-col sm:flex-row gap-[35px] sm:items-center">
                <label className="flex items-center gap-[14px] cursor-pointer">
                  <input type="radio" name="topic" checked={topic === "hi"} onChange={() => setTopic("hi")} className="form-checkbox" />
                  <span className="text-black">Say Hi</span>
                </label>
                <label className="flex items-center gap-[14px] cursor-pointer">
                  <input type="radio" name="topic" checked={topic === "quote"} onChange={() => setTopic("quote")} className="form-checkbox" />
                  <span className="text-black">Get a Quote</span>
                </label>
              </div>

              <div>
                <label htmlFor="name" className="block text-black mb-2">Name*</label>
                <input type="text" id="name" required placeholder="Name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-[30px] py-[18px] border border-black rounded-[14px] text-black outline-none" />
              </div>

              <div>
                <label htmlFor="email" className="block text-black mb-2">Email*</label>
                <input type="email" id="email" required placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-[30px] py-[18px] border border-black rounded-[14px] text-black outline-none" />
              </div>

              <div>
                <label htmlFor="message" className="block text-black mb-2">Message*</label>
                <textarea id="message" required placeholder="Message" value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} className="w-full px-[30px] py-[18px] border border-black rounded-[14px] text-black outline-none" rows={4} />
              </div>

              <button type="submit" className="btn-primary w-full">Send Message</button>
            </form>
          )}
          <div className="absolute right-[-12%] top-[2%] bottom-[2%] hidden lg:flex items-center">
            <Image src="/figma/cta-illustration.svg" alt="Contact illustration" width={400} height={400} className="h-full w-auto object-contain opacity-90" />
          </div>
        </div>
      </div>
      <style>{`
        .form-checkbox {
          appearance: none;
          width: 28px;
          height: 28px;
          border: 1px solid #000;
          border-radius: 50%;
          outline: none;
          cursor: pointer;
          position: relative;
        }
        .form-checkbox:before {
          content: "";
          display: block;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          position: absolute;
          top: 0;
          left: 0;
          background: var(--green);
          transform: scale(0);
          transition: transform 0.1s ease-in-out;
        }
        .form-checkbox:checked:before {
          transform: scale(0.6);
        }
      `}</style>
    </section>
  );
}
