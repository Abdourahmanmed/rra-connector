"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { toast } from "sonner"

import { PdfPreviewCard } from "@/components/documents/PdfPreviewCard"
import { FiscalInfoCard } from "@/components/invoices/FiscalInfoCard"
import { InvoiceDetailsCard } from "@/components/invoices/InvoiceDetailsCard"
import { InvoiceItemsTable } from "@/components/invoices/InvoiceItemsTable"
import { PublicLinkCard } from "@/components/qr/PublicLinkCard"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { getApiErrorMessage, withAuthHeader } from "@/lib/auth"
import { apiClient } from "@/lib/api/client"

type InvoiceDetail = {
  id: string
  sagePiece: string
  sageDocType: string
  sageDocumentNo: string | null
  customerCode: string | null
  customerName: string | null
  customerTin: string | null
  customerPhone: string | null
  customerEmail: string | null
  customerAddress: string | null
  paymentMode: string | null
  doneBy: string | null
  invoiceDate: string
  dueDate: string | null
  currencyCode: string
  exchangeRate: number
  subtotalAmount: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  importStatus: string
  fiscalStatus: string
  pdfStatus: string
  qrStatus: string
  importedAt: string | null
  lastAttemptAt: string | null
  createdAt: string
  updatedAt: string
  items: Array<{
    id: string
    lineNo: number
    itemCode: string | null
    itemName: string
    batchNumber: string | null
    expiryDate: string | null
    quantity: number
    unitPrice: number
    discountAmount: number
    taxRate: number
    taxAmount: number
    lineTotal: number
    unitOfMeasure: string | null
  }>
  fiscalResult: {
    id: string
    rcptNo: string
    verificationUrl: string | null
    fiscalDay: string | null
    taxAmount: number | null
    totalAmount: number | null
    receivedAt: string | null
  } | null
  documents: Array<{
    id: string
    type: string
    status: string
    fileName: string
    mimeType: string
    storagePath: string
    fileSizeBytes: number | null
    generatedAt: string | null
    expiresAt: string | null
    downloadUrl: string
  }>
  publicLinks: Array<{
    id: string
    label: string | null
    targetUrl: string
    isRevoked: boolean
    expiresAt: string | null
    lastAccessedAt: string | null
    createdAt: string
  }>
}

type InvoiceDetailResponse = {
  success: boolean
  data: InvoiceDetail
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const invoiceId = useMemo(() => params?.id ?? "", [params])
  const { token } = useAuth()

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isFiscalizing, setIsFiscalizing] = useState(false)
  const [isGeneratingQr, setIsGeneratingQr] = useState(false)

  const loadInvoice = useCallback(async () => {
    if (!token || !invoiceId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await apiClient.get<InvoiceDetailResponse>(`/api/invoices/${invoiceId}`, {
        headers: withAuthHeader(token),
      })

      if (!response.data.success) {
        throw new Error("Unable to load invoice details")
      }

      setInvoice(response.data.data)
    } catch (fetchError) {
      setError(getApiErrorMessage(fetchError, "Could not load invoice details. Please try again."))
    } finally {
      setIsLoading(false)
    }
  }, [invoiceId, token])

  useEffect(() => {
    void loadInvoice()
  }, [loadInvoice])

  async function handleFiscalize() {
    if (!token || !invoice) {
      return
    }

    setIsFiscalizing(true)
    try {
      await apiClient.post(`/api/invoices/${invoice.id}/fiscalize`, undefined, {
        headers: withAuthHeader(token),
      })
      toast.success("Fiscalization request sent.")
      await loadInvoice()
    } catch (actionError) {
      toast.error(getApiErrorMessage(actionError, "Could not fiscalize this invoice."))
    } finally {
      setIsFiscalizing(false)
    }
  }

  async function handleGenerateQr() {
    if (!token || !invoice) {
      return
    }

    setIsGeneratingQr(true)
    try {
      await apiClient.post(`/api/invoices/${invoice.id}/generate-public-link`, undefined, {
        headers: withAuthHeader(token),
      })
      toast.success("Public link and QR generated.")
      await loadInvoice()
    } catch (actionError) {
      toast.error(getApiErrorMessage(actionError, "Could not generate public link and QR."))
    } finally {
      setIsGeneratingQr(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link href="/invoices" className="text-sm text-muted-foreground underline-offset-4 hover:underline">
          ← Back to invoices
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Invoice details</h1>
            <p className="text-sm text-muted-foreground">Review line items, fiscal data, and generated documents.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleFiscalize} disabled={isLoading || isFiscalizing || !invoice}>
              {isFiscalizing ? "Fiscalizing..." : "Fiscalize"}
            </Button>
            <Button variant="secondary" onClick={handleGenerateQr} disabled={isLoading || isGeneratingQr || !invoice}>
              {isGeneratingQr ? "Generating QR..." : "Generate QR"}
            </Button>
          </div>
        </div>
      </header>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      {isLoading ? (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">Loading invoice details...</p>
      ) : invoice ? (
        <div className="space-y-6">
          <InvoiceDetailsCard invoice={invoice} />
          <InvoiceItemsTable items={invoice.items} currencyCode={invoice.currencyCode} />
          <div className="grid gap-4 lg:grid-cols-3">
            <FiscalInfoCard fiscalResult={invoice.fiscalResult} currencyCode={invoice.currencyCode} />
            <PdfPreviewCard documents={invoice.documents} />
            <PublicLinkCard links={invoice.publicLinks} />
          </div>
        </div>
      ) : (
        <p className="rounded-md border p-4 text-sm text-muted-foreground">Invoice not found.</p>
      )}
    </section>
  )
}
