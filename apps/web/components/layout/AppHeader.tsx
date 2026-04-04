"use client"

import { Menu } from "lucide-react"

import { Button } from "@/components/ui/button"

type AppHeaderProps = {
  onOpenMobileNav?: () => void
}

export function AppHeader({ onOpenMobileNav }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:px-6">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium">Dashboard</p>
        <p className="text-xs text-muted-foreground">Overview & operations</p>
      </div>
    </header>
  )
}
