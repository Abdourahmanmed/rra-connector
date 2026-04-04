"use client"

import { useEffect, useState } from "react"

import { RecentInvoicesTable } from "@/components/dashboard/RecentInvoicesTable"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { apiClient } from "@/lib/api/client"
import { withAuthHeader } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"

type DashboardSummary = {
  totals: {
    importedInvoices: number
    successfulFiscalizations: number
    failedFiscalizations: number
    pendingInvoices: number
    generatedPdfs: number
  }
  recentInvoices: Array<{
    id: string
    sagePiece: string
    sageDocumentNo: string | null
    customerName: string | null
    invoiceDate: string
    totalAmount: number
    fiscalStatus: string
    pdfStatus: string
  }>
}

type DashboardSummaryResponse = {
  success: boolean
  data: DashboardSummary
}

export default function DashboardPage() {
  const { token } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSummary() {
      if (!token) {
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.get<DashboardSummaryResponse>("/api/dashboard/summary", {
          headers: withAuthHeader(token),
        })

        if (!response.data.success) {
          throw new Error("Unable to load dashboard summary")
        }

        setSummary(response.data.data)
      } catch {
        setError("Could not load dashboard summary. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadSummary()
  }, [token])

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Fiscalization and invoice processing overview.</p>
      </header>

      <StatsCards totals={summary?.totals} isLoading={isLoading} />

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <RecentInvoicesTable invoices={summary?.recentInvoices ?? []} isLoading={isLoading} />
    </section>
  )
}
