"use client"
import { Moon, Sun, Palette, Monitor, Sunset, Leaf, Zap, Droplets, Flame, Heart, Waves } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const themes = [
  { name: "light", label: "Light", icon: Sun, description: "Clean light theme" },
  { name: "dark", label: "Dark", icon: Moon, description: "Classic dark theme" },
  { name: "system", label: "System", icon: Monitor, description: "Follow system preference" },
  { name: "blue", label: "Ocean Blue", icon: Droplets, description: "Calming blue theme" },
  { name: "green", label: "Forest Green", icon: Leaf, description: "Natural green theme" },
  { name: "purple", label: "Royal Purple", icon: Zap, description: "Elegant purple theme" },
  { name: "orange", label: "Sunset Orange", icon: Sunset, description: "Warm orange theme" },
  { name: "red", label: "Fire Red", icon: Flame, description: "Bold red theme" },
  { name: "pink", label: "Rose Pink", icon: Heart, description: "Soft pink theme" },
  { name: "teal", label: "Teal Cyan", icon: Waves, description: "Cool teal theme" }
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  const currentTheme = themes.find(t => t.name === theme) || themes[0]
  const CurrentIcon = currentTheme.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <CurrentIcon className="h-[1.2rem] w-[1.2rem] transition-all" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Choose Theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {themes.map((themeOption) => {
          const Icon = themeOption.icon
          return (
            <DropdownMenuItem
              key={themeOption.name}
              onClick={() => setTheme(themeOption.name)}
              className={`flex items-start gap-3 p-3 cursor-pointer ${
                theme === themeOption.name ? "bg-accent" : ""
              }`}
            >
              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium">{themeOption.label}</div>
                <div className="text-xs text-muted-foreground">{themeOption.description}</div>
              </div>
              {theme === themeOption.name && (
                <div className="h-2 w-2 rounded-full bg-primary" />
              )}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
