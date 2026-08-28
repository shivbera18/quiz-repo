"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ContactSection() {
  const [topic, setTopic] = useState<"hi" | "quote">("hi");
  const [sent, setSent] = useState(false);
  const [data, setData] = useState({ name: "", email: "", msg: "" });
  const [error, setError] = useState("");
  return (
    <section id="contact" className="w-full max-w-[1240px] mx-auto px-6 scroll-mt-28">
      <div className="mt-16">
        <div className="text-xs font-mono text-primary mb-4">● contact</div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Contact Us</h2>
        <p className="text-muted-foreground mt-2">Let&apos;s discuss your needs.</p>
        <div className="glass rounded-lg p-8 mt-10 max-w-[640px]">
          {sent ? (
            <div className="space-y-4" role="status" aria-live="polite" tabIndex={-1}>
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">✓</div>
              <h3 className="font-medium">Thank you!</h3>
              <p className="text-sm text-muted-foreground">Message received. We will get back to you soon.</p>
              <Button onClick={() => { setSent(false); setData({ name: "", email: "", msg: "" }); setError(""); }}>Send another</Button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (!data.name) { setError("Name is required"); return; } if (!data.email) { setError("Email is required"); return; } setError(""); setSent(true); }} className="space-y-5" noValidate>
              <fieldset className="flex gap-6">
                <legend className="sr-only">Topic</legend>
                <label htmlFor="topic-hi" className="flex items-center gap-2 text-sm cursor-pointer"><input id="topic-hi" type="radio" name="topic" value="hi" checked={topic === "hi"} onChange={() => setTopic("hi")} className="accent-primary" /> Say Hi</label>
                <label htmlFor="topic-quote" className="flex items-center gap-2 text-sm cursor-pointer"><input id="topic-quote" type="radio" name="topic" value="quote" checked={topic === "quote"} onChange={() => setTopic("quote")} className="accent-primary" /> Get a Quote</label>
              </fieldset>
              <div>
                <label htmlFor="contact-name" className="text-sm font-medium">Name*</label>
                <input id="contact-name" value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="Name" required aria-required="true" autoComplete="name" className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div>
                <label htmlFor="contact-email" className="text-sm font-medium">Email*</label>
                <input id="contact-email" value={data.email} onChange={e => setData({...data, email: e.target.value})} placeholder="Email" type="email" required aria-required="true" autoComplete="email" className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              <div>
                <label htmlFor="contact-msg" className="text-sm font-medium">Message*</label>
                <textarea id="contact-msg" value={data.msg} onChange={e => setData({...data, msg: e.target.value})} placeholder="Message" rows={4} required aria-required="true" className="mt-1 w-full p-3 rounded-md border border-input bg-background focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
              </div>
              {error && <p role="alert" aria-live="polite" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full glow-accent" aria-label="Send contact message">Send Message</Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
