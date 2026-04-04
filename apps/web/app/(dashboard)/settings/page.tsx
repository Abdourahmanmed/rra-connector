"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { TestConnectionResult } from "@/components/setup/TestConnectionResult"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useAuth } from "@/hooks/use-auth"
import { withAuthHeader } from "@/lib/auth"
import { apiClient } from "@/lib/api/client"
import { mapVsdcPayload, setupDefaultValues, setupSchema, type ApiResult } from "@/lib/setup"

const settingsSchema = setupSchema
  .pick({ sql: true, vsdc: true, company: true })
  .extend({
    sql: setupSchema.shape.sql.extend({ password: z.string().optional() }),
    vsdc: setupSchema.shape.vsdc.extend({ branchId: z.string().optional() }),
    company: setupSchema.shape.company.omit({ adminPassword: true }),
  })

type SettingsFormValues = z.infer<typeof settingsSchema>

type SettingsResponse = {
  success: boolean
  data: {
    company: {
      name?: string
      tin?: string
      address?: string
      phone?: string
      email?: string
    }
    publicUrl: string | null
    seller: {
      name?: string
      tin?: string
      address?: string
      phone?: string
      email?: string
    }
    vsdc: {
      baseUrl: string | null
      deviceId: string | null
      clientId: string | null
      hasClientSecret: boolean
    }
    sql: {
      host: string
      instance: string | null
      port: number
      database: string
      username: string
      authType: "SQL_AUTH" | "WINDOWS_AUTH"
      hasPassword: boolean
    }
  }
}

export default function SettingsPage() {
  const { token } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingSql, setIsTestingSql] = useState(false)
  const [isTestingVsdc, setIsTestingVsdc] = useState(false)
  const [hasStoredSqlPassword, setHasStoredSqlPassword] = useState(false)
  const [hasStoredVsdcSecret, setHasStoredVsdcSecret] = useState(false)
  const [sqlResult, setSqlResult] = useState<{ state: "idle" | "success" | "error"; message?: string; details?: string }>({ state: "idle" })
  const [vsdcResult, setVsdcResult] = useState<{ state: "idle" | "success" | "error"; message?: string; details?: string }>({ state: "idle" })

  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      sql: setupDefaultValues.sql,
      vsdc: setupDefaultValues.vsdc,
      company: {
        companyName: setupDefaultValues.company.companyName,
        sellerName: setupDefaultValues.company.sellerName,
        sellerAddress: setupDefaultValues.company.sellerAddress,
        sellerPhone: setupDefaultValues.company.sellerPhone,
        sellerEmail: setupDefaultValues.company.sellerEmail,
        publicBaseUrl: setupDefaultValues.company.publicBaseUrl,
      },
    },
  })

  useEffect(() => {
    async function loadSettings(activeToken: string) {
      setIsLoading(true)

      try {
        const response = await apiClient.get<SettingsResponse>("/api/settings", {
          headers: withAuthHeader(activeToken),
        })

        if (!response.data.success) {
          throw new Error("Unable to load settings")
        }

        const current = response.data.data
        setHasStoredSqlPassword(current.sql.hasPassword)
        setHasStoredVsdcSecret(current.vsdc.hasClientSecret)

        form.reset({
          sql: {
            host: current.sql.host,
            instance: current.sql.instance ?? "",
            port: current.sql.port,
            database: current.sql.database,
            username: current.sql.username,
            password: "",
            authType: current.sql.authType,
          },
          vsdc: {
            tin: current.vsdc.clientId ?? current.company.tin ?? current.seller.tin ?? "",
            branchId: "",
            deviceSerialNumber: current.vsdc.deviceId ?? "",
            vsdcBaseUrl: current.vsdc.baseUrl ?? "",
          },
          company: {
            companyName: current.company.name ?? "",
            sellerName: current.seller.name ?? "",
            sellerAddress: current.seller.address ?? current.company.address ?? "",
            sellerPhone: current.seller.phone ?? current.company.phone ?? "",
            sellerEmail: current.seller.email ?? current.company.email ?? "",
            publicBaseUrl: current.publicUrl ?? "",
          },
        })
      } catch {
        toast.error("Could not load settings. Please refresh and try again.")
      } finally {
        setIsLoading(false)
      }
    }

    if (!token) {
      return
    }

    void loadSettings(token)
  }, [form, token])

  const testSqlConnection = async () => {
    const valid = await form.trigger("sql")
    if (!valid) {
      toast.error("Please fix SQL validation issues first")
      return
    }

    const values = form.getValues("sql")

    if (!values.password && hasStoredSqlPassword) {
      setSqlResult({ state: "error", message: "Enter SQL password to run a test connection." })
      toast.error("Enter SQL password to run a test connection")
      return
    }

    setIsTestingSql(true)

    try {
      const response = await apiClient.post<ApiResult>(
        "/api/setup/test-sql",
        {
          ...values,
          timeoutMs: 5000,
        },
        {
          headers: token ? withAuthHeader(token) : undefined,
        }
      )

      setSqlResult({ state: "success", message: response.data.message ?? "SQL connection test succeeded." })
      toast.success("SQL connection is valid")
    } catch (error) {
      const message = error instanceof Error ? error.message : "SQL test failed"
      setSqlResult({ state: "error", message: "SQL connection test failed.", details: message })
      toast.error(message)
    } finally {
      setIsTestingSql(false)
    }
  }

  const testVsdcConnection = async () => {
    const valid = await form.trigger("vsdc")
    if (!valid) {
      toast.error("Please fix VSDC validation issues first")
      return
    }

    const values = form.getValues("vsdc")

    if (!values.branchId && hasStoredVsdcSecret) {
      setVsdcResult({ state: "error", message: "Enter VSDC client secret to run a test connection." })
      toast.error("Enter VSDC client secret to run a test connection")
      return
    }

    setIsTestingVsdc(true)

    try {
      const response = await apiClient.post<ApiResult>(
        "/api/setup/test-vsdc",
        {
          ...mapVsdcPayload(values),
          timeoutMs: 5000,
        },
        {
          headers: token ? withAuthHeader(token) : undefined,
        }
      )

      setVsdcResult({ state: "success", message: response.data.message ?? "VSDC connection test succeeded." })
      toast.success("VSDC connection is valid")
    } catch (error) {
      const message = error instanceof Error ? error.message : "VSDC test failed"
      setVsdcResult({ state: "error", message: "VSDC connection test failed.", details: message })
      toast.error(message)
    } finally {
      setIsTestingVsdc(false)
    }
  }

  const submitSettings = async (values: SettingsFormValues) => {
    if (!token) {
      toast.error("Authentication token is missing")
      return
    }

    setIsSaving(true)

    try {
      await apiClient.patch(
        "/api/settings",
        {
          company: {
            name: values.company.companyName,
            tin: values.vsdc.tin,
            address: values.company.sellerAddress,
            phone: values.company.sellerPhone,
            email: values.company.sellerEmail,
          },
          publicUrl: values.company.publicBaseUrl,
          seller: {
            name: values.company.sellerName,
            tin: values.vsdc.tin,
            address: values.company.sellerAddress,
            phone: values.company.sellerPhone,
            email: values.company.sellerEmail,
          },
          vsdc: {
            baseUrl: values.vsdc.vsdcBaseUrl,
            deviceId: values.vsdc.deviceSerialNumber,
            clientId: values.vsdc.tin,
            ...(values.vsdc.branchId ? { clientSecret: values.vsdc.branchId } : {}),
          },
          sql: {
            host: values.sql.host,
            instance: values.sql.instance,
            port: values.sql.port,
            database: values.sql.database,
            username: values.sql.username,
            authType: values.sql.authType,
            ...(values.sql.password ? { password: values.sql.password } : {}),
          },
        },
        {
          headers: withAuthHeader(token),
        }
      )

      toast.success("Settings saved successfully")
      setHasStoredSqlPassword(true)
      setHasStoredVsdcSecret(true)
      form.setValue("sql.password", "")
      form.setValue("vsdc.branchId", "")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save settings"
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage company profile, VSDC, and SQL Server connection settings.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Connector configuration</CardTitle>
          <CardDescription>Update configuration and verify external connections before saving.</CardDescription>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading settings...</p>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(submitSettings)} className="space-y-8">
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Company Info</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="company.companyName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company Name</FormLabel>
                        <FormControl><Input placeholder="Acme Trading Ltd" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="company.sellerName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seller Name</FormLabel>
                        <FormControl><Input placeholder="Main Branch Seller" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="company.sellerAddress" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seller Address</FormLabel>
                        <FormControl><Input placeholder="Kigali, Rwanda" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="company.sellerPhone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seller Phone</FormLabel>
                        <FormControl><Input placeholder="+2507..." {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="company.sellerEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seller Email</FormLabel>
                        <FormControl><Input type="email" placeholder="seller@company.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="company.publicBaseUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Public Base URL</FormLabel>
                        <FormControl><Input placeholder="https://connector.company.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">VSDC Config</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="vsdc.tin" render={({ field }) => (
                      <FormItem>
                        <FormLabel>TIN / Client ID</FormLabel>
                        <FormControl><Input placeholder="100123456" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="vsdc.branchId" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Branch ID / Client Secret</FormLabel>
                        <FormControl><Input type="password" placeholder={hasStoredVsdcSecret ? "••••••••" : "BR001"} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="vsdc.deviceSerialNumber" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Device Serial Number</FormLabel>
                        <FormControl><Input placeholder="SDC-0001" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="vsdc.vsdcBaseUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>VSDC Base URL</FormLabel>
                        <FormControl><Input placeholder="https://vsdc.example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <Button type="button" variant="secondary" onClick={testVsdcConnection} disabled={isTestingVsdc}>
                    {isTestingVsdc ? "Testing VSDC connection..." : "Test VSDC connection"}
                  </Button>
                  <TestConnectionResult state={vsdcResult.state} title="VSDC connection" message={vsdcResult.message} details={vsdcResult.details} />
                </div>

                <Separator />

                <div className="space-y-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">SQL Server Config</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField control={form.control} name="sql.host" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Host</FormLabel>
                        <FormControl><Input placeholder="192.168.1.10" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sql.instance" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instance</FormLabel>
                        <FormControl><Input placeholder="SQLEXPRESS" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sql.port" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Port</FormLabel>
                        <FormControl><Input type="number" placeholder="1433" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sql.database" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Database</FormLabel>
                        <FormControl><Input placeholder="Sage100" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sql.username" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl><Input placeholder="sa" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sql.password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl><Input type="password" placeholder={hasStoredSqlPassword ? "••••••••" : ""} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <FormField control={form.control} name="sql.authType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Authentication Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="w-full md:w-[280px]">
                            <SelectValue placeholder="Select auth type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="SQL_AUTH">SQL Authentication</SelectItem>
                          <SelectItem value="WINDOWS_AUTH">Windows Authentication</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <Button type="button" variant="secondary" onClick={testSqlConnection} disabled={isTestingSql}>
                    {isTestingSql ? "Testing SQL connection..." : "Test SQL connection"}
                  </Button>
                  <TestConnectionResult state={sqlResult.state} title="SQL connection" message={sqlResult.message} details={sqlResult.details} />
                </div>

                <CardFooter className="justify-end border-t px-0 pt-6">
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving settings..." : "Save settings"}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
