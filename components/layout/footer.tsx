import Link from "next/link"
import { Github, Mail, Heart } from "lucide-react"
import { QuizzyLogo } from "@/components/ui/quizzy-logo"

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background py-10 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
          {/* Brand */}
          <div className="flex items-start gap-4 md:gap-6 md:flex-1">
            <QuizzyLogo size="sm" showText={true} className="!gap-2" />
            <div className="hidden md:block">
              <p className="text-sm text-muted-foreground max-w-xs">
                Lightweight practice, analytics, and mock tests tailored for banking exams.
              </p>
              <p className="mt-3 text-xs text-muted-foreground">© {new Date().getFullYear()} Quizzy — Built by Shiv Choudhary</p>
            </div>
          </div>

          {/* Center links */}
          <nav className="flex gap-6 items-center">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms
            </Link>
            <a href="mailto:shivbera45@gmail.com" className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact
            </a>
          </nav>

          {/* Social / small note */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/shivbera18"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              aria-label="GitHub"
            >
              <Github className="h-5 w-5" />
              <span className="hidden sm:inline">@shivbera18</span>
            </a>
            <span className="hidden md:inline text-xs text-muted-foreground">Made with <Heart className="inline h-3 w-3 text-red-500 mx-1" /> for exam success</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
