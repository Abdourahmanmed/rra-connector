"use client"

import { useEffect, useMemo, useState } from "react"

import { useAuth } from "@/hooks/use-auth"
import { InvoicesTable } from "@/components/invoices/InvoicesTable"
import { apiClient } from "@/lib/api/client"
import { withAuthHeader } from "@/lib/auth"

type ApiInvoice = {
  id: string
  sagePiece: string
  sageDocumentNo: string | null
  customerName: string | null
  invoiceDate: string
  totalAmount: number
  fiscalStatus: string
  pdfStatus: string
}

type InvoicesResponse = {
  success: boolean
  data: {
    items: ApiInvoice[]
    pagination: {
      page: number
      pageSize: number
      totalItems: number
      totalPages: number
    }
  }
}

const PAGE_SIZE = 10

export default function InvoicesPage() {
  const { token } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rows, setRows] = useState<ApiInvoice[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const currentToken = token

      if (!currentToken) {
        setIsLoading(false)
        return
      }

      async function loadInvoices(activeToken: string) {
        setIsLoading(true)
        setError(null)

        try {
          const response = await apiClient.get<InvoicesResponse>("/api/invoices", {
            headers: withAuthHeader(activeToken),
            params: {
              page: currentPage,
              pageSize: PAGE_SIZE,
              search: search.trim() ? search : undefined,
              fiscalStatus: statusFilter === "ALL" ? undefined : statusFilter,
              sortBy: "invoiceDate",
              sortOrder: "desc",
            },
          })

          if (!response.data.success) {
            throw new Error("Unable to load invoices")
          }

          setRows(response.data.data.items)
          setTotalItems(response.data.data.pagination.totalItems)
          setTotalPages(response.data.data.pagination.totalPages)
        } catch {
          setError("Could not load invoices. Please try again.")
        } finally {
          setIsLoading(false)
        }
      }

      void loadInvoices(currentToken)
    }, 300)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [token, currentPage, search, statusFilter])

  useEffect(() => {
    setCurrentPage(1)
  }, [search, statusFilter])

  const tableRows = useMemo(
    () =>
      rows.map((invoice) => ({
        id: invoice.id,
        number: invoice.sageDocumentNo ?? invoice.sagePiece,
        date: invoice.invoiceDate,
        customer: invoice.customerName ?? "-",
        amount: invoice.totalAmount,
        status: invoice.fiscalStatus,
        pdfStatus: invoice.pdfStatus,
      })),
    [rows]
  )

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground">Browse and manage imported invoices.</p>
      </header>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <InvoicesTable
        data={tableRows}
        isLoading={isLoading}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
        onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
      />
    </section>
  )
}
