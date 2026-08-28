import Link from "next/link"
import { Github } from "lucide-react"

const links = [
  { name: "About us", href: "#about" },
  { name: "Services", href: "#services" },
  { name: "Use Cases", href: "#use-cases" },
  { name: "Pricing", href: "#pricing" },
  { name: "Blog", href: "#testimonials" },
];

export function Footer() {
  return (
    <section className="sm:px-5">
      <div className="w-full max-w-[1240px] mx-auto">
        <div className="px-[15px] bg-dark text-gray py-[55px] lg:px-[60px] sm:rounded-t-[45px] mt-16">
          <div>
            <div className="flex flex-col lg:flex-row gap-7 items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5">
                <svg width="32" height="32" viewBox="0 0 36 36" fill="none" className="text-white"><path d="M18 0L21.8 14.2L36 18L21.8 21.8L18 36L14.2 21.8L0 18L14.2 14.2L18 0Z" fill="currentColor"/></svg>
                <span className="font-medium text-2xl text-white font-grotesk">Positivus</span>
              </Link>
              <ul className="flex flex-col sm:flex-row gap-5">
                {links.map((link) => (
                  <li key={link.name}><a href={link.href} className="text-white underline hover:text-green">{link.name}</a></li>
                ))}
              </ul>
              <ul className="flex gap-5">
                <li><a href="https://github.com/shivbera18" target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-full bg-white text-dark flex items-center justify-center"><Github className="h-4 w-4" /></a></li>
              </ul>
            </div>

            <div className="flex flex-col lg:flex-row mt-[66px] mb-[51px] gap-10">
              <div className="flex flex-col gap-5 lg:w-1/2">
                <span className="greenhead w-fit">Contact us:</span>
                <p className="text-white">Email: shivbera45@gmail.com</p>
                <p className="text-white">Phone: +91 98765 43210</p>
                <p className="text-white">Address: Quizzy HQ, New Delhi, India</p>
              </div>
              <div className="flex-1 bg-[#292A32] rounded-[14px] p-6 md:p-8 border border-white/10 flex flex-col sm:flex-row items-center gap-4">
                <input type="email" placeholder="Email" className="w-full sm:flex-1 h-12 px-4 rounded-[14px] bg-transparent border border-white/30 text-white placeholder:text-white/50 text-sm focus:outline-none focus:border-green" />
                <button type="button" className="w-full sm:w-auto h-12 px-6 rounded-[14px] bg-green text-black font-medium hover:bg-white transition-colors shrink-0">Subscribe to news</button>
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-gray mb-5" />
          <div className="flex flex-col lg:flex-row h-20 justify-center mt-4 text-center md:justify-between md:mt-0 text-white text-sm">
            <span>© {new Date().getFullYear()} Positivus. All Rights Reserved.</span>
            <Link href="/privacy" className="underline hover:text-green">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </section>
  )
}
