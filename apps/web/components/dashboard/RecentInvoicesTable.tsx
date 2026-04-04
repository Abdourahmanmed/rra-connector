import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type RecentInvoice = {
  id: string
  sagePiece: string
  sageDocumentNo: string | null
  customerName: string | null
  invoiceDate: string
  totalAmount: number
  fiscalStatus: string
  pdfStatus: string
}

type RecentInvoicesTableProps = {
  invoices: RecentInvoice[]
  isLoading: boolean
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (["ACCEPTED", "GENERATED"].includes(status)) {
    return "default"
  }

  if (["REJECTED", "ERROR"].includes(status)) {
    return "destructive"
  }

  if (["NOT_GENERATED", "PENDING"].includes(status)) {
    return "secondary"
  }

  return "outline"
}

export function RecentInvoicesTable({ invoices, isLoading }: RecentInvoicesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent invoices</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Fiscal</TableHead>
              <TableHead>PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={`loading-row-${index}`}>
                    {Array.from({ length: 6 }).map((__, skeletonIndex) => (
                      <TableCell key={`loading-cell-${index}-${skeletonIndex}`}>
                        <Skeleton className="h-4 w-full max-w-[140px]" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.sageDocumentNo ?? invoice.sagePiece}</TableCell>
                    <TableCell>{invoice.customerName ?? "-"}</TableCell>
                    <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">{currency.format(invoice.totalAmount)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(invoice.fiscalStatus)}>{invoice.fiscalStatus}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(invoice.pdfStatus)}>{invoice.pdfStatus}</Badge>
                    </TableCell>
                  </TableRow>
                ))}

            {!isLoading && invoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  No invoices available yet.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
