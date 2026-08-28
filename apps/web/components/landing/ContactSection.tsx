"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function ContactSection() {
  const [topic, setTopic] = useState<"hi" | "quote">("hi");
  const [sent, setSent] = useState(false);
  const [data, setData] = useState({ name: "", email: "", msg: "" });
  return (
    <section id="contact" className="w-full max-w-[1240px] mx-auto px-6 scroll-mt-28">
      <div className="mt-16">
        <div className="text-xs font-mono text-primary mb-4">● contact</div>
        <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Contact Us</h2>
        <p className="text-muted-foreground mt-2">Let&apos;s discuss your needs.</p>
        <div className="glass rounded-lg p-8 mt-10 max-w-[640px]">
          {sent ? (
            <div className="space-y-4">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">✓</div>
              <h3 className="font-medium">Thank you!</h3>
              <p className="text-sm text-muted-foreground">Message received.</p>
              <Button onClick={() => { setSent(false); setData({ name: "", email: "", msg: "" }); }}>Send another</Button>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (!data.name || !data.email) return; setSent(true); }} className="space-y-5">
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={topic === "hi"} onChange={() => setTopic("hi")} className="accent-primary" /> Say Hi</label>
                <label className="flex items-center gap-2 text-sm"><input type="radio" checked={topic === "quote"} onChange={() => setTopic("quote")} className="accent-primary" /> Get a Quote</label>
              </div>
              <div><label className="text-sm font-medium">Name*</label><input value={data.name} onChange={e => setData({...data, name: e.target.value})} placeholder="Name" className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background" /></div>
              <div><label className="text-sm font-medium">Email*</label><input value={data.email} onChange={e => setData({...data, email: e.target.value})} placeholder="Email" className="mt-1 w-full h-10 px-3 rounded-md border border-input bg-background" /></div>
              <div><label className="text-sm font-medium">Message*</label><textarea value={data.msg} onChange={e => setData({...data, msg: e.target.value})} placeholder="Message" rows={4} className="mt-1 w-full p-3 rounded-md border border-input bg-background" /></div>
              <Button type="submit" className="w-full glow-accent">Send Message</Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
