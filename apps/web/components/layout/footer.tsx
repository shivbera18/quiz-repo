import Link from "next/link"
import Image from "next/image"
import { Github, Mail, Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="w-full bg-[#191A23] text-white rounded-t-[35px] md:rounded-t-[45px] mt-24 pt-14 pb-10">
      <div className="container mx-auto px-4 md:px-8 space-y-12">
        {/* Top: Logo and Navigation */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-10 border-b border-white/15">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#B9FF66] flex items-center justify-center font-black text-[#191A23] text-base">
              ✦
            </div>
            <span className="font-bold text-2xl tracking-tight text-white font-heading">
              Positivus<span className="text-[#B9FF66]">.</span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-white/80 font-medium">
            <a href="#services" className="hover:text-[#B9FF66] transition-colors">Services</a>
            <a href="#process" className="hover:text-[#B9FF66] transition-colors">Working Process</a>
            <a href="#pricing" className="hover:text-[#B9FF66] transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-[#B9FF66] transition-colors">FAQ</a>
            <Link href="/privacy" className="hover:text-[#B9FF66] transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#B9FF66] transition-colors">Terms of Service</Link>
          </div>
        </div>

        {/* Middle: Contact Info & Newsletter Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Contact */}
          <div className="lg:col-span-5 space-y-4">
            <span className="inline-block px-2.5 py-0.5 bg-[#B9FF66] text-[#191A23] font-bold text-sm rounded-[7px] font-heading">
              Contact us:
            </span>
            <div className="space-y-2 text-sm text-white/80">
              <p>Email: <a href="mailto:shivbera45@gmail.com" className="text-white hover:underline">shivbera45@gmail.com</a></p>
              <p>Phone: <span className="text-white">+91 98765 43210</span></p>
              <p>Address: Quizzy HQ, New Delhi, India</p>
            </div>
          </div>

          {/* Right: Newsletter Box */}
          <div className="lg:col-span-7 bg-[#292A32] rounded-[14px] p-6 md:p-8 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
            <input
              type="email"
              placeholder="Email"
              className="w-full sm:flex-1 h-12 px-4 rounded-[14px] bg-transparent border border-white/30 text-white placeholder:text-white/50 text-sm focus:outline-none focus:border-[#B9FF66]"
            />
            <button
              type="button"
              className="w-full sm:w-auto h-12 px-6 rounded-[14px] bg-[#B9FF66] text-[#191A23] font-bold text-sm hover:bg-[#a6f050] transition-colors shrink-0"
            >
              Subscribe to news
            </button>
          </div>
        </div>

        {/* Bottom: Credits & Copyright */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>© {new Date().getFullYear()} Positivus / Quizzy. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com/shivbera18" target="_blank" rel="noopener noreferrer" className="hover:text-white flex items-center gap-1.5">
              <Github className="h-3.5 w-3.5" /> @shivbera18
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
