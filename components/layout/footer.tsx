import Link from "next/link"
import { BookOpen, Mail, HelpCircle, Shield, FileText } from "lucide-react"

export function Footer() {
  return (
    <footer className="w-full border-t-4 border-black dark:border-yellow-500/60 bg-yellow-300 dark:bg-yellow-400 py-4 mt-auto relative z-20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="h-6 w-6 text-black dark:text-black" />
              <span className="text-xl font-black text-black dark:text-black">Quizzy</span>
            </div>
            <p className="text-sm text-black dark:text-black text-center md:text-left">
              Your ultimate companion for banking exam preparation. Practice, learn, and succeed.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-lg font-bold text-black dark:text-black mb-4">Quick Links</h3>
            <div className="flex flex-col gap-2">
              <Link href="/dashboard" className="text-sm font-medium text-black dark:text-black hover:underline hover:text-primary transition-colors flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Dashboard
              </Link>
              <Link href="/profile" className="text-sm font-medium text-black dark:text-black hover:underline hover:text-primary transition-colors flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Profile
              </Link>
              <Link href="/analytics" className="text-sm font-medium text-black dark:text-black hover:underline hover:text-primary transition-colors flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                Analytics
              </Link>
            </div>
          </div>

          {/* Legal & Support */}
          <div className="flex flex-col items-center md:items-start">
            <h3 className="text-lg font-bold text-black dark:text-black mb-4">Legal & Support</h3>
            <div className="flex flex-col gap-2">
              <Link href="/privacy" className="text-sm font-medium text-black dark:text-black hover:underline hover:text-primary transition-colors flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Privacy Policy
              </Link>
              <Link href="/terms" className="text-sm font-medium text-black dark:text-black hover:underline hover:text-primary transition-colors flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Terms of Service
              </Link>
              <a
                href="mailto:support@quizzy.com"
                className="text-sm font-medium text-black dark:text-black hover:underline hover:text-primary transition-colors flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Support
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-6 border-t border-black/20 dark:border-black/40">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-center text-sm leading-loose font-medium text-black dark:text-black">
              © {new Date().getFullYear()} Quizzy. All rights reserved. Built with ❤️ for exam success.
            </p>
            <div className="flex gap-4">
              {/* Social links can be added here if needed */}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
