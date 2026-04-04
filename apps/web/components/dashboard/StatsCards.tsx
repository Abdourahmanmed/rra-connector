import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type DashboardTotals = {
  importedInvoices: number
  successfulFiscalizations: number
  failedFiscalizations: number
  pendingInvoices: number
  generatedPdfs: number
}

type StatsCardsProps = {
  totals?: DashboardTotals
  isLoading: boolean
}

const statsConfig: Array<{ key: keyof DashboardTotals; label: string }> = [
  { key: "importedInvoices", label: "Total invoices" },
  { key: "successfulFiscalizations", label: "Success" },
  { key: "failedFiscalizations", label: "Failed" },
  { key: "pendingInvoices", label: "Pending" },
  { key: "generatedPdfs", label: "PDFs" },
]

export function StatsCards({ totals, isLoading }: StatsCardsProps) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {statsConfig.map((stat) => (
        <Card key={stat.key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground">{stat.label}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-2xl font-semibold tracking-tight">{totals?.[stat.key] ?? 0}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
