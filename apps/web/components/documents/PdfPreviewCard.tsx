import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type InvoiceDocument = {
  id: string
  type: string
  status: string
  fileName: string
  mimeType: string
  storagePath: string
  fileSizeBytes: number | null
  generatedAt: string | null
}

type PdfPreviewCardProps = {
  documents: InvoiceDocument[]
}

function canOpen(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://")
}

export function PdfPreviewCard({ documents }: PdfPreviewCardProps) {
  const latestPdf = documents.find((document) => document.type === "INVOICE_PDF")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {latestPdf ? (
          <>
            <div className="grid gap-2 text-sm sm:grid-cols-2">
              <p>
                <span className="text-muted-foreground">File:</span> {latestPdf.fileName}
              </p>
              <p>
                <span className="text-muted-foreground">Status:</span> {latestPdf.status}
              </p>
              <p>
                <span className="text-muted-foreground">Mime:</span> {latestPdf.mimeType}
              </p>
              <p>
                <span className="text-muted-foreground">Size:</span> {latestPdf.fileSizeBytes ?? "-"}
              </p>
            </div>
            {canOpen(latestPdf.storagePath) ? (
              <a
                href={latestPdf.storagePath}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Open latest PDF
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">Latest PDF is stored on server path: {latestPdf.storagePath}</p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No PDF generated yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
