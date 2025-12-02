import Link from "next/link"

export function Footer() {
  return (
    <footer className="w-full border-t-4 border-black dark:border-yellow-500/60 bg-yellow-200 dark:bg-yellow-500 py-6 mt-auto relative z-30 md:ml-[296px] md:w-[calc(100%-296px)]">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row md:py-0 px-4 sm:px-6">
        <div className="flex flex-col items-center gap-4 md:flex-row md:gap-2">
          <p className="text-center text-sm leading-loose font-medium md:text-left text-black dark:text-black">
            Built by{" "}
            <a
              href="#"
              target="_blank"
              rel="noreferrer"
              className="font-black underline underline-offset-4 hover:text-primary text-black dark:text-black"
            >
              Quizzy
            </a>
            . © {new Date().getFullYear()} All rights reserved.
          </p>
        </div>
        <div className="flex gap-4 text-sm font-bold text-black dark:text-black">
          <Link href="/privacy" className="hover:underline hover:text-primary transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:underline hover:text-primary transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </footer>
  )
}
