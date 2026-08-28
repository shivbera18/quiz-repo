import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
    darkMode: ["class"],
    content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
  	container: {
  		center: true,
  		padding: "2rem",
  		screens: { "2xl": "1400px" }
  	},
  	extend: {
  		fontFamily: {
  			sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
  			mono: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
  			"mono-console": ["Consolas", "Lucida Console", "Courier New", "monospace"],
  			grotesk: ["IBM Plex Sans", "sans-serif"],
  			heading: ["IBM Plex Sans", "sans-serif"],
  		},
  		backgroundImage: {
  			"card-fade": "linear-gradient(to bottom, transparent 0%, transparent 30%, hsl(var(--card) / 30%) 60%, hsl(var(--card) / 100%))",
  		},
  		dropShadow: {
  			"dialog-close": ["0 0 8px rgb(0 0 0 / 1)", "0 4px 3px rgb(0 0 0 / 1)"],
  		},
  		colors: {
  			border: "hsl(var(--border))",
  			input: "hsl(var(--input))",
  			ring: "hsl(var(--ring))",
  			background: {
  				DEFAULT: "hsl(var(--background))",
  				main: "hsl(var(--background-main))",
  			},
  			foreground: "hsl(var(--foreground))",
  			primary: {
  				DEFAULT: "hsl(var(--primary))",
  				foreground: "hsl(var(--primary-foreground))",
  			},
  			secondary: {
  				DEFAULT: "hsl(var(--secondary))",
  				foreground: "hsl(var(--secondary-foreground))",
  			},
  			destructive: {
  				DEFAULT: "hsl(var(--destructive))",
  				foreground: "hsl(var(--destructive-foreground))",
  			},
  			warning: {
  				DEFAULT: "hsl(var(--warning))",
  				foreground: "hsl(var(--warning-foreground))",
  			},
  			muted: {
  				DEFAULT: "hsl(var(--muted))",
  				foreground: "hsl(var(--muted-foreground))",
  				destructive: "hsl(var(--muted-destructive))",
  			},
  			accent: {
  				DEFAULT: "hsl(var(--accent))",
  				foreground: "hsl(var(--accent-foreground))",
  			},
  			popover: {
  				DEFAULT: "hsl(var(--popover))",
  				foreground: "hsl(var(--popover-foreground))",
  			},
  			card: {
  				DEFAULT: "hsl(var(--card))",
  				foreground: "hsl(var(--card-foreground))",
  			},
  			// Rivet aliases for legacy positivus code
  			green: "hsl(var(--primary))",
  			black: "hsl(var(--foreground))",
  			dark: "hsl(var(--card))",
  			gray: "hsl(var(--muted))",
  			white: "hsl(var(--card))",
  			positivus: {
  				green: "hsl(var(--primary))",
  				dark: "hsl(var(--card))",
  				grey: "hsl(var(--muted))",
  				black: "hsl(var(--foreground))",
  				white: "hsl(var(--card))",
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			}
  		},
  		borderRadius: {
  			lg: "var(--radius)",
  			md: "calc(var(--radius) - 2px)",
  			sm: "calc(var(--radius) - 4px)",
  		},
  		keyframes: {
  			'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
  			'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
  			'caret-blink': { "0%,70%,100%": { opacity: "1" }, "20%,50%": { opacity: "0" } },
  			'bounce-x': { "0%,100%": { transform: "translateX(25%)" }, "50%": { transform: "translateX(-25%)" } },
  			shake: {
  				"10%, 90%": { transform: "translate3d(-1px, 0, 0)" },
  				"20%, 80%": { transform: "translate3d(2px, 0, 0)" },
  				"30%, 50%, 70%": { transform: "translate3d(-4px, 0, 0)" },
  				"40%, 60%": { transform: "translate3d(4px, 0, 0)" },
  			},
  			'shimmer-slide': { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(100%)" } },
  			'border-glow': { "0%, 100%": { opacity: "0.5" }, "50%": { opacity: "1" } },
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'caret-blink': 'caret-blink 1.25s ease-out infinite',
  			'bounce-x': 'bounce-x 5s ease infinite',
  			shake: 'shake 0.82s cubic-bezier(.36,.07,.19,.97) both',
  			'shimmer-slide': 'shimmer-slide 2s ease-in-out infinite',
  			'border-glow': 'border-glow 2s ease-in-out infinite',
  		},
  	}
  },
  plugins: [tailwindcssAnimate],
};
export default config;
