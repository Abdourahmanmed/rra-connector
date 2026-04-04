import type { PropsWithChildren } from "react"

export function AppShell({ children }: PropsWithChildren) {
  return <div className="min-h-svh bg-background text-foreground">{children}</div>
}
