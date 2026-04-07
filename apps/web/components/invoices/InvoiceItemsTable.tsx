import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getCurrencyFormatter } from "@/lib/currency"

type InvoiceItem = {
  id: string
  lineNo: number
  itemCode: string | null
  itemName: string
  quantity: number
  unitPrice: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  lineTotal: number
  unitOfMeasure: string | null
}

type InvoiceItemsTableProps = {
  items: InvoiceItem[]
  currencyCode: string
}

export function InvoiceItemsTable({ items, currencyCode }: InvoiceItemsTableProps) {
  const currency = getCurrencyFormatter(currencyCode)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice items</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Line</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">UoM</TableHead>
                <TableHead className="text-right">Unit Price</TableHead>
                <TableHead className="text-right">Discount</TableHead>
                <TableHead className="text-right">Tax %</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length > 0 ? (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.lineNo}</TableCell>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell>{item.itemCode ?? "-"}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{item.unitOfMeasure ?? "-"}</TableCell>
                    <TableCell className="text-right">{currency.format(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{currency.format(item.discountAmount)}</TableCell>
                    <TableCell className="text-right">{item.taxRate}%</TableCell>
                    <TableCell className="text-right">{currency.format(item.taxAmount)}</TableCell>
                    <TableCell className="text-right font-medium">{currency.format(item.lineTotal)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="py-6 text-center text-muted-foreground">
                    No items found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
