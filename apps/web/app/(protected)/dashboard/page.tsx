"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"

export default function DashboardPage() {
  const { user, logout } = useAuth()

  return (
    <main className="mx-auto flex w-full max-w-6xl px-4 py-10">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
          <CardDescription>Connector admin area.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{user?.email}</span>
          </p>
          <Button variant="outline" onClick={() => void logout()}>
            Logout
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
