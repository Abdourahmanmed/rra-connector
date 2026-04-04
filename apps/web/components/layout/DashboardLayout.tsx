"use client"

import type { PropsWithChildren } from "react"
import { useState } from "react"

import { AppHeader } from "@/components/layout/AppHeader"
import { AppSidebar } from "@/components/layout/AppSidebar"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function DashboardLayout({ children }: PropsWithChildren) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  return (
    <div className="min-h-svh bg-background">
      <div className="grid min-h-svh md:grid-cols-[250px_1fr]">
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex min-w-0 flex-col">
          <AppHeader onOpenMobileNav={() => setIsMobileNavOpen(true)} />
          <main className="flex-1 bg-muted/20 p-4 md:p-6">{children}</main>
        </div>
      </div>

      <Sheet open={isMobileNavOpen} onOpenChange={setIsMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation menu</SheetTitle>
            <SheetDescription>Navigate dashboard pages.</SheetDescription>
          </SheetHeader>
          <AppSidebar onNavigate={() => setIsMobileNavOpen(false)} />
        </SheetContent>
      </Sheet>
    </div>
  )
}
