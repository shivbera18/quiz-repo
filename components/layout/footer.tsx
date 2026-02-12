import Link from "next/link"
import { BookOpen, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="w-full border-t-4 border-black dark:border-yellow-500/60 bg-yellow-300 dark:bg-yellow-400 py-6 mt-auto relative z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-black dark:text-black" />
            <div>
              <span className="text-lg font-black text-black dark:text-black">Quizzy</span>
              <p className="text-xs text-black/80 dark:text-black/80">Banking Exam Prep</p>
            </div>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm font-medium text-black dark:text-black hover:underline hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm font-medium text-black dark:text-black hover:underline hover:text-primary transition-colors">
              Terms
            </Link>
            <a
              href="mailto:support@quizzy.com"
              className="text-sm font-medium text-black dark:text-black hover:underline hover:text-primary transition-colors flex items-center gap-1"
            >
              <Mail className="h-4 w-4" />
              Support
            </a>
          </div>

          {/* Copyright */}
          <div className="text-sm font-medium text-black dark:text-black">
            © {new Date().getFullYear()} Quizzy
          </div>
        </div>
      </div>
    </footer>
  )
}
