import Link from "next/link"

export function Footer() {
    return (
        <footer className="w-full border-t-4 border-black dark:border-white/20 bg-yellow-100 dark:bg-zinc-900 py-6 mt-auto relative z-10">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row md:py-0 px-4 sm:px-6">
                <div className="flex flex-col items-center gap-4 md:flex-row md:gap-2">
                    <p className="text-center text-sm leading-loose font-medium md:text-left">
                        Built by{" "}
                        <a
                            href="#"
                            target="_blank"
                            rel="noreferrer"
                            className="font-black underline underline-offset-4 hover:text-primary"
                        >
                            Quizzy
                        </a>
                        . The source code is available on{" "}
                        <a
                            href="#"
                            target="_blank"
                            rel="noreferrer"
                            className="font-black underline underline-offset-4 hover:text-primary"
                        >
                            GitHub
                        </a>
                        .
                    </p>
                </div>
                <div className="flex gap-4 text-sm font-bold">
                    <Link href="#" className="hover:underline hover:text-primary transition-colors">
                        Privacy Policy
                    </Link>
                    <Link href="#" className="hover:underline hover:text-primary transition-colors">
                        Terms of Service
                    </Link>
                </div>
            </div>
        </footer>
    )
}
