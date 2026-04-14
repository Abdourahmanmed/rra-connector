import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toBackendUrl } from "@/lib/api/url"

type InvoiceDocument = {
  id: string
  type: string
  status: string
  fileName: string
  mimeType: string
  storagePath: string
  fileSizeBytes: number | null
  generatedAt: string | null
  downloadUrl: string
}

type PdfPreviewCardProps = {
  documents: InvoiceDocument[]
}

export function PdfPreviewCard({ documents }: PdfPreviewCardProps) {
  const latestPdf = documents.find((document) => document.type === "INVOICE_PDF")
  const latestPdfUrl = latestPdf ? toBackendUrl(latestPdf.downloadUrl) : null

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
              <p>
                <span className="text-muted-foreground">Generated:</span>{" "}
                {latestPdf.generatedAt ? new Date(latestPdf.generatedAt).toLocaleString() : "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href={latestPdfUrl ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Open PDF
              </a>
              <a
                href={latestPdfUrl ?? undefined}
                download
                className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Download PDF
              </a>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No PDF generated yet. A background job will generate it automatically.</p>
        )}
      </CardContent>
    </Card>
  )
}
