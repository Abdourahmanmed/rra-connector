import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type TestConnectionResultProps = {
  state: "idle" | "success" | "error"
  title: string
  message?: string
  details?: string
}

export function TestConnectionResult({
  state,
  title,
  message,
  details,
}: TestConnectionResultProps) {
  if (state === "idle") {
    return null
  }

  return (
    <Card
      className={cn(
        "border",
        state === "success"
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-destructive/30 bg-destructive/5"
      )}
    >
      <CardContent className="space-y-1 pt-4">
        <p className="text-sm font-medium">{title}</p>
        {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
        {details ? <p className="text-xs text-destructive">{details}</p> : null}
      </CardContent>
    </Card>
  )
}
