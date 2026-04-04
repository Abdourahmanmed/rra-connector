import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type FiscalResult = {
  id: string
  rcptNo: string
  verificationUrl: string | null
  fiscalDay: string | null
  taxAmount: number | null
  totalAmount: number | null
  receivedAt: string | null
}

type FiscalInfoCardProps = {
  fiscalResult: FiscalResult | null
  currencyCode: string
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-"
  }

  return new Date(value).toLocaleString()
}

export function FiscalInfoCard({ fiscalResult, currencyCode }: FiscalInfoCardProps) {
  const currency = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode || "USD",
    maximumFractionDigits: 2,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fiscal data</CardTitle>
      </CardHeader>
      <CardContent>
        {fiscalResult ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Receipt no.</p>
              <p className="font-medium">{fiscalResult.rcptNo}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fiscal day</p>
              <p className="font-medium">{fiscalResult.fiscalDay ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Tax amount</p>
              <p className="font-medium">{fiscalResult.taxAmount !== null ? currency.format(fiscalResult.taxAmount) : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total amount</p>
              <p className="font-medium">{fiscalResult.totalAmount !== null ? currency.format(fiscalResult.totalAmount) : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Received at</p>
              <p className="font-medium">{formatDate(fiscalResult.receivedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Verification URL</p>
              {fiscalResult.verificationUrl ? (
                <a
                  href={fiscalResult.verificationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  Open verification link
                </a>
              ) : (
                <p className="font-medium">-</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No fiscal result yet. Fiscalize invoice to populate this section.</p>
        )}
      </CardContent>
    </Card>
  )
}
