import Link from "next/link"

import { getCurrencyFormatter } from "@/lib/currency"

type PublicInvoiceResponse = {
  success: boolean
  data: {
    invoice: {
      invoiceNumber: string
      invoiceDate: string
      currencyCode: string
      customerName: string | null
      subtotalAmount: number
      discountAmount: number
      taxAmount: number
      totalAmount: number
    }
    fiscalResult: {
      rcptNo: string
    } | null
    documents: Array<{
      id: string
      mimeType: string
    }>
  }
  error?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? ""
const COMPANY_NAME = process.env.NEXT_PUBLIC_COMPANY_NAME ?? "Company"

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
})

type FieldProps = {
  label: string
  value: string
}

function Field({ label, value }: FieldProps) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-foreground">{value}</p>
    </div>
  )
}

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const endpoint = `${API_BASE_URL}/api/public/invoice/${encodeURIComponent(token)}`
  const response = await fetch(endpoint, { cache: "no-store" })

  if (!response.ok) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          This public invoice link is invalid or has expired.
        </div>
      </main>
    )
  }

  const payload = (await response.json()) as PublicInvoiceResponse

  if (!payload.success) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          {payload.error ?? "Unable to load invoice."}
        </div>
      </main>
    )
  }

  const { invoice, fiscalResult, documents } = payload.data
  const currency = getCurrencyFormatter(invoice.currencyCode)

  const pdfDocument = documents.find((document) => document.mimeType === "application/pdf")

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="space-y-6 rounded-2xl border bg-background p-4 shadow-sm sm:p-6">
        <header className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Public Invoice</p>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{COMPANY_NAME}</h1>
        </header>

        <section className="grid gap-3 sm:grid-cols-2">
          <Field label="Invoice Number" value={invoice.invoiceNumber} />
          <Field label="Date" value={dateFormatter.format(new Date(invoice.invoiceDate))} />
          <Field label="Customer" value={invoice.customerName ?? "Walk-in customer"} />
          <Field label="Receipt No" value={fiscalResult?.rcptNo ?? "Not available"} />
        </section>

        <section className="space-y-2 rounded-xl border bg-muted/30 p-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{currency.format(invoice.subtotalAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium">{currency.format(invoice.discountAmount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">{currency.format(invoice.taxAmount)}</span>
          </div>
          <div className="flex items-center justify-between border-t pt-2 text-base">
            <span className="font-semibold">Total</span>
            <span className="font-semibold">{currency.format(invoice.totalAmount)}</span>
          </div>
        </section>

        <section>
          {pdfDocument ? (
            <Link
              href={`${API_BASE_URL}/api/public/invoice/${encodeURIComponent(token)}/pdf?documentId=${encodeURIComponent(pdfDocument.id)}`}
              className="inline-flex w-full items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted sm:w-auto"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Invoice PDF
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">PDF not available yet.</p>
          )}
        </section>
      </div>
    </main>
  )
}
