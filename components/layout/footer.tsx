import Link from "next/link"
import { Github, Mail, Heart } from "lucide-react"
import { QuizzyLogo } from "@/components/ui/quizzy-logo"

export function Footer() {
  return (
    <footer className="w-full border-t border-border bg-background/50 backdrop-blur-sm py-12 mt-auto">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="md:col-span-2">
            <div className="mb-4">
              <QuizzyLogo size="md" showText={true} />
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Empowering banking aspirants with comprehensive preparation tools, practice tests, and analytics to achieve exam success.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
            <div className="space-y-2">
              <Link href="/dashboard" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Dashboard
              </Link>
              <Link href="/analytics" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Analytics
              </Link>
              <Link href="/profile" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Profile
              </Link>
            </div>
          </div>

          {/* Contact & Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Contact & Legal</h4>
            <div className="space-y-2">
              <a
                href="mailto:shivbera45@gmail.com"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="h-4 w-4" />
                shivbera45@gmail.com
              </a>
              <a
                href="https://github.com/shivbera18"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <Github className="h-4 w-4" />
                @shivbera18
              </a>
              <Link href="/privacy" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="block text-sm text-muted-foreground hover:text-primary transition-colors">
                Terms of Service
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-border">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} Quizzy. Built with <Heart className="inline h-4 w-4 text-red-500 mx-1" /> by Shiv Choudhary.
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Made for banking exam success</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
