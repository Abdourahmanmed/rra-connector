"use client"

import { LayoutDashboard, FileText, LogOut, ScrollText, Settings } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { APP_NAME } from "@/lib/constants"
import { cn } from "@/lib/utils"

const navigationItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/invoices",
    label: "Invoices",
    icon: FileText,
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
  },
  {
    href: "/logs",
    label: "Logs",
    icon: ScrollText,
  },
] as const

type AppSidebarProps = {
  onNavigate?: () => void
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const pathname = usePathname()
  const { logout, isLoading } = useAuth()

  return (
    <aside className="flex h-full w-full flex-col border-r bg-card/30">
      <div className="border-b px-5 py-4">
        <p className="text-sm font-semibold tracking-tight">{APP_NAME}</p>
        <p className="text-xs text-muted-foreground">Workspace</p>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary",
              )}
            >
              <Icon className="size-4" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-3">
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-2.5 px-3 py-2 text-sm"
          onClick={() => {
            onNavigate?.()
            void logout()
          }}
          disabled={isLoading}
        >
          <LogOut className="size-4" />
          <span>{isLoading ? "Loading..." : "Logout"}</span>
        </Button>
      </div>
    </aside>
  )
}
