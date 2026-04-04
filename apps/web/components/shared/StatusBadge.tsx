import { Badge } from "@/components/ui/badge"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

type StatusBadgeProps = {
  status: string
}

function toVariant(status: string): BadgeVariant {
  const normalizedStatus = status.trim().toUpperCase()

  if (["ACCEPTED", "GENERATED", "SUCCESS", "COMPLETED"].includes(normalizedStatus)) {
    return "default"
  }

  if (["REJECTED", "FAILED", "ERROR"].includes(normalizedStatus)) {
    return "destructive"
  }

  if (["PENDING", "PROCESSING", "NOT_GENERATED"].includes(normalizedStatus)) {
    return "secondary"
  }

  return "outline"
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge variant={toVariant(status)}>{status}</Badge>
}
