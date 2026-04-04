"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form } from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { CompanyInfoStep } from "@/src/components/setup/CompanyInfoStep"
import { SqlServerStep } from "@/src/components/setup/SqlServerStep"
import { TestConnectionResult } from "@/src/components/setup/TestConnectionResult"
import { VsdcStep } from "@/src/components/setup/VsdcStep"
import { ROUTES } from "@/src/lib/constants"

const setupSchema = z.object({
  sql: z.object({
    host: z.string().min(1, "SQL host is required"),
    instance: z.string().optional(),
    port: z.coerce.number().int().min(1).max(65535),
    database: z.string().min(1, "Database is required"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    authType: z.enum(["SQL_AUTH", "WINDOWS_AUTH"]),
  }),
  vsdc: z.object({
    tin: z.string().min(1, "TIN is required"),
    branchId: z.string().min(1, "Branch ID is required"),
    deviceSerialNumber: z.string().min(1, "Device serial number is required"),
    vsdcBaseUrl: z.string().url("Provide a valid VSDC URL"),
  }),
  company: z.object({
    companyName: z.string().min(1, "Company name is required"),
    sellerName: z.string().min(1, "Seller name is required"),
    sellerAddress: z.string().min(1, "Seller address is required"),
    sellerPhone: z.string().min(1, "Seller phone is required"),
    sellerEmail: z.string().email("Provide a valid seller email"),
    publicBaseUrl: z.string().url("Provide a valid public URL"),
    adminPassword: z.string().min(8, "Admin password must be at least 8 characters"),
  }),
})

export type SetupFormValues = z.infer<typeof setupSchema>

type ApiResult = {
  success: boolean
  message?: string
  error?: string
  details?: unknown
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""

async function postJson<T extends ApiResult>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const body = (await response.json().catch(() => null)) as T | null

  if (!response.ok) {
    const message = body?.error ?? body?.message ?? `Request failed (${response.status})`
    throw new Error(message)
  }

  if (!body) {
    throw new Error("Empty response from server")
  }

  return body
}

async function patchJson(path: string, payload: unknown): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiResult | null
    throw new Error(body?.error ?? body?.message ?? `Request failed (${response.status})`)
  }
}

export function SetupWizard() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isTestingSql, setIsTestingSql] = useState(false)
  const [isTestingVsdc, setIsTestingVsdc] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [sqlResult, setSqlResult] = useState<{ state: "idle" | "success" | "error"; message?: string; details?: string }>({
    state: "idle",
  })
  const [vsdcResult, setVsdcResult] = useState<{ state: "idle" | "success" | "error"; message?: string; details?: string }>({
    state: "idle",
  })

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      sql: {
        host: "",
        instance: "",
        port: 1433,
        database: "",
        username: "",
        password: "",
        authType: "SQL_AUTH",
      },
      vsdc: {
        tin: "",
        branchId: "",
        deviceSerialNumber: "",
        vsdcBaseUrl: "",
      },
      company: {
        companyName: "",
        sellerName: "",
        sellerAddress: "",
        sellerPhone: "",
        sellerEmail: "",
        publicBaseUrl: "",
        adminPassword: "",
      },
    },
  })

  const steps = useMemo(
    () => [
      { title: "SQL Server / Sage", description: "Configure source ERP connection" },
      { title: "VSDC / RRA", description: "Configure fiscal gateway access" },
      { title: "Company / Admin", description: "Set business profile and admin access" },
    ],
    []
  )

  const testSqlConnection = async () => {
    const valid = await form.trigger("sql")
    if (!valid) {
      toast.error("Please fix SQL validation issues first")
      return
    }

    setIsTestingSql(true)
    const sql = form.getValues("sql")

    try {
      const result = await postJson<ApiResult>("/api/setup/test-sql", {
        ...sql,
        timeoutMs: 5000,
      })

      setSqlResult({ state: "success", message: result.message ?? "SQL connection test succeeded." })
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

    setIsTestingVsdc(true)

    const vsdc = form.getValues("vsdc")

    try {
      const result = await postJson<ApiResult>("/api/setup/test-vsdc", {
        baseUrl: vsdc.vsdcBaseUrl,
        deviceId: vsdc.deviceSerialNumber,
        clientId: vsdc.tin,
        clientSecret: vsdc.branchId,
        timeoutMs: 5000,
      })

      setVsdcResult({ state: "success", message: result.message ?? "VSDC connection test succeeded." })
      toast.success("VSDC connection is valid")
    } catch (error) {
      const message = error instanceof Error ? error.message : "VSDC test failed"
      setVsdcResult({ state: "error", message: "VSDC connection test failed.", details: message })
      toast.error(message)
    } finally {
      setIsTestingVsdc(false)
    }
  }

  const nextStep = async () => {
    const target = currentStep === 0 ? "sql" : currentStep === 1 ? "vsdc" : "company"
    const valid = await form.trigger(target)

    if (!valid) {
      toast.error("Please complete required fields before continuing")
      return
    }

    setCurrentStep((step) => Math.min(step + 1, steps.length - 1))
  }

  const previousStep = () => setCurrentStep((step) => Math.max(step - 1, 0))

  const submitSetup = async (values: SetupFormValues) => {
    setIsSubmitting(true)

    try {
      await postJson<ApiResult>("/api/setup/complete", {
        sql: values.sql,
        vsdc: {
          baseUrl: values.vsdc.vsdcBaseUrl,
          deviceId: values.vsdc.deviceSerialNumber,
          clientId: values.vsdc.tin,
          clientSecret: values.vsdc.branchId,
        },
      })

      await patchJson("/api/settings", {
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
      })

      toast.success("Setup completed successfully")
      toast.info("Admin password capture is complete; backend provisioning endpoint is pending.")

      router.push(ROUTES.login)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to complete setup"
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Initial Connector Setup</CardTitle>
        <CardDescription>
          Configure SQL, VSDC, and company profile before using the dashboard.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <ol className="grid gap-2 sm:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className={`rounded-md border p-3 text-xs ${index === currentStep ? "border-primary bg-primary/5" : "border-border"}`}
            >
              <p className="font-medium">{index + 1}. {step.title}</p>
              <p className="text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(submitSetup)} className="space-y-6">
            {currentStep === 0 ? (
              <>
                <SqlServerStep form={form} onTest={testSqlConnection} isTesting={isTestingSql} />
                <TestConnectionResult
                  state={sqlResult.state}
                  title="SQL connection"
                  message={sqlResult.message}
                  details={sqlResult.details}
                />
              </>
            ) : null}

            {currentStep === 1 ? (
              <>
                <VsdcStep form={form} onTest={testVsdcConnection} isTesting={isTestingVsdc} />
                <TestConnectionResult
                  state={vsdcResult.state}
                  title="VSDC connection"
                  message={vsdcResult.message}
                  details={vsdcResult.details}
                />
              </>
            ) : null}

            {currentStep === 2 ? <CompanyInfoStep form={form} /> : null}

            <CardFooter className="justify-between border-t px-0 pt-6">
              <Button type="button" variant="outline" onClick={previousStep} disabled={currentStep === 0 || isSubmitting}>
                Back
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Continue
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Completing setup..." : "Complete setup"}
                </Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
