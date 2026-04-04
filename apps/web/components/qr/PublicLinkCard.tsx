import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type InvoicePublicLink = {
  id: string
  label: string | null
  targetUrl: string
  isRevoked: boolean
  expiresAt: string | null
  lastAccessedAt: string | null
  createdAt: string
}

type PublicLinkCardProps = {
  links: InvoicePublicLink[]
}

function formatDate(date: string | null): string {
  if (!date) {
    return "-"
  }

  return new Date(date).toLocaleString()
}

export function PublicLinkCard({ links }: PublicLinkCardProps) {
  const activeLink = links.find((link) => !link.isRevoked)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Public QR link</CardTitle>
      </CardHeader>
      <CardContent>
        {activeLink ? (
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Label:</span> {activeLink.label ?? "Public invoice link"}
            </p>
            <p>
              <span className="text-muted-foreground">Created:</span> {formatDate(activeLink.createdAt)}
            </p>
            <p>
              <span className="text-muted-foreground">Last accessed:</span> {formatDate(activeLink.lastAccessedAt)}
            </p>
            <a
              href={activeLink.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block font-medium text-primary underline-offset-4 hover:underline"
            >
              Open public invoice link
            </a>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No public link generated yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
