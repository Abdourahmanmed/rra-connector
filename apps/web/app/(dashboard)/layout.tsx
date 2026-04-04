import type { PropsWithChildren } from "react"

import { DashboardLayout } from "@/components/layout/DashboardLayout"

export default function DashboardRouteLayout({ children }: PropsWithChildren) {
  return <DashboardLayout>{children}</DashboardLayout>
}
