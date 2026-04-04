import { StatusBadge } from "@/components/shared/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type InvoiceDetails = {
  id: string
  sagePiece: string
  sageDocType: string
  sageDocumentNo: string | null
  customerCode: string | null
  customerName: string | null
  customerTin: string | null
  invoiceDate: string
  dueDate: string | null
  currencyCode: string
  subtotalAmount: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  importStatus: string
  fiscalStatus: string
  pdfStatus: string
  qrStatus: string
}

type InvoiceDetailsCardProps = {
  invoice: InvoiceDetails
}

const currencyFormatter = (currencyCode: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 2,
  })

function renderDate(value: string | null): string {
  if (!value) {
    return "-"
  }

  return new Date(value).toLocaleString()
}

export function InvoiceDetailsCard({ invoice }: InvoiceDetailsCardProps) {
  const currency = currencyFormatter(invoice.currencyCode)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Invoice number</p>
            <p className="font-medium">{invoice.sageDocumentNo ?? invoice.sagePiece}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Invoice date</p>
            <p className="font-medium">{renderDate(invoice.invoiceDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Due date</p>
            <p className="font-medium">{renderDate(invoice.dueDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Doc type</p>
            <p className="font-medium">{invoice.sageDocType}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-medium">{invoice.customerName ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Customer code</p>
            <p className="font-medium">{invoice.customerCode ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Customer TIN</p>
            <p className="font-medium">{invoice.customerTin ?? "-"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Currency</p>
            <p className="font-medium">{invoice.currencyCode}</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Import status</p>
            <StatusBadge status={invoice.importStatus} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Fiscal status</p>
            <StatusBadge status={invoice.fiscalStatus} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">PDF status</p>
            <StatusBadge status={invoice.pdfStatus} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">QR status</p>
            <StatusBadge status={invoice.qrStatus} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Subtotal</p>
            <p className="font-semibold">{currency.format(invoice.subtotalAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Discount</p>
            <p className="font-semibold">{currency.format(invoice.discountAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tax</p>
            <p className="font-semibold">{currency.format(invoice.taxAmount)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold">{currency.format(invoice.totalAmount)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
