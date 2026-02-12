import Link from "next/link"
import Image from "next/image"
import { Github, Mail, Heart } from "lucide-react"

export function Footer() {
  return (
    <footer className="w-full relative bg-background/60 mt-auto">
      {/* Top pills (centered) */}
      <div className="absolute inset-x-0 -top-6 flex justify-center pointer-events-none">
        <div className="pointer-events-auto flex gap-3">
          <a href="mailto:shivbera45@gmail.com" className="px-4 py-2 bg-white dark:bg-zinc-900 rounded-full text-sm font-medium text-foreground/90 shadow-sm hover:bg-foreground/5 transition flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            Contact
          </a>
          <Link href="/privacy" className="px-4 py-2 bg-white dark:bg-zinc-900 rounded-full text-sm font-medium text-foreground/90 shadow-sm hover:bg-foreground/5 transition">
            Privacy Policy
          </Link>
          <Link href="/terms" className="px-4 py-2 bg-white dark:bg-zinc-900 rounded-full text-sm font-medium text-foreground/90 shadow-sm hover:bg-foreground/5 transition">
            Terms
          </Link>
          <a href="https://shivcdhry.vercel.app" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white dark:bg-zinc-900 rounded-full text-sm font-medium text-foreground/90 shadow-sm hover:bg-foreground/5 transition flex items-center gap-2">
            Portfolio
          </a>
          <a href="https://github.com/shivbera18" target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white dark:bg-zinc-900 rounded-full text-sm font-medium text-foreground/90 shadow-sm hover:bg-foreground/5 transition flex items-center gap-2">
            <Github className="h-4 w-4" />
            <span>@shivbera18</span>
          </a>
        </div>
      </div>

      {/* Main area with large faded brand wordmark */}
      <div className="pt-20 pb-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <h2 className="select-none text-6xl md:text-[140px] leading-none font-extrabold text-foreground/6 opacity-60 tracking-tight">Quizzy</h2>

          {/* Bottom centered avatar + built by */}
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-border">
                <Image src="/my_photo/download4_upscaled.png" alt="Shiv Choudhary" width={48} height={48} />
              </div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-red-100">
                  <Heart className="h-4 w-4 text-red-600" />
                </span>
                <span>Built by <span className="font-semibold text-foreground">Shiv Choudhary</span></span>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">© {new Date().getFullYear()} Quizzy. All rights reserved.</div>
          </div>
        </div>
      </div>
    </footer>
  )
}
