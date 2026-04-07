"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { ROUTES } from "@/lib/constants"

const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading } = useAuth()

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(ROUTES.dashboard)
    }
  }, [isAuthenticated, isLoading, router])

  const onSubmit = async (values: LoginFormValues) => {
    try {
      await login(values)
      toast.success("Welcome back")
      router.push(ROUTES.dashboard)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to login")
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-57px)] w-full max-w-md items-center px-4 py-10">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Connector Admin Login</CardTitle>
          <CardDescription>Sign in with your connector admin credentials.</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" placeholder="admin@company.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || isLoading}>
                {form.formState.isSubmitting ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              Need an admin account?{" "}
              <Link href={ROUTES.register} className="underline underline-offset-4">
                Register here
              </Link>
              .
            </p>
            <p>
              New environment? Complete setup first in the{" "}
              <Link href={ROUTES.setup} className="underline underline-offset-4">
                setup wizard
              </Link>
              .
            </p>
          </div>
        </CardFooter>
      </Card>
    </main>
  )
}
