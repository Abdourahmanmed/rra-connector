"use client"

import type { PropsWithChildren } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { useAuth } from "@/hooks/use-auth"

export default function DashboardRouteLayout({ children }: PropsWithChildren) {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login")
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return <main className="p-6 text-sm text-muted-foreground">Loading...</main>
  }

  if (!isAuthenticated) {
    return null
  }

  return <DashboardLayout>{children}</DashboardLayout>
}
