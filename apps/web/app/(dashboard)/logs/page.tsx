"use client"

import { useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/hooks/use-auth"
import { apiClient } from "@/lib/api/client"
import { withAuthHeader } from "@/lib/auth"

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR"

type ApiLog = {
  id: string
  invoiceId: string | null
  level: LogLevel
  source: string
  message: string
  createdAt: string
}

type LogsResponse = {
  success: boolean
  data: {
    items: ApiLog[]
  }
}

const PAGE_SIZE = 50

export default function LogsPage() {
  const { token } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<ApiLog[]>([])
  const [levelFilter, setLevelFilter] = useState<"ALL" | LogLevel>("ALL")
  const [invoiceIdFilter, setInvoiceIdFilter] = useState("")

  useEffect(() => {
    if (!token) {
      setIsLoading(false)
      return
    }

    async function loadLogs(activeToken: string) {
      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.get<LogsResponse>("/api/logs", {
          headers: withAuthHeader(activeToken),
          params: {
            page: 1,
            pageSize: PAGE_SIZE,
            level: levelFilter === "ALL" ? undefined : levelFilter,
            invoiceId: invoiceIdFilter.trim() || undefined,
          },
        })

        if (!response.data.success) {
          throw new Error("Unable to load logs")
        }

        setLogs(response.data.data.items)
      } catch {
        setError("Could not load logs. Please try again.")
      } finally {
        setIsLoading(false)
      }
    }

    void loadLogs(token)
  }, [token, levelFilter, invoiceIdFilter])

  const sortedLogs = useMemo(() => [...logs].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [logs])

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Logs</h1>
        <p className="text-sm text-muted-foreground">Search recent processing and system events.</p>
      </header>

      {error ? <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="w-full space-y-2 md:max-w-[220px]">
            <p className="text-sm font-medium">Level</p>
            <Select value={levelFilter} onValueChange={(value) => setLevelFilter(value as "ALL" | LogLevel)}>
              <SelectTrigger>
                <SelectValue placeholder="All levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All levels</SelectItem>
                <SelectItem value="DEBUG">DEBUG</SelectItem>
                <SelectItem value="INFO">INFO</SelectItem>
                <SelectItem value="WARN">WARN</SelectItem>
                <SelectItem value="ERROR">ERROR</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full space-y-2 md:max-w-[320px]">
            <p className="text-sm font-medium">Invoice ID</p>
            <Input value={invoiceIdFilter} onChange={(event) => setInvoiceIdFilter(event.target.value)} placeholder="Filter by invoice id" />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setLevelFilter("ALL")
              setInvoiceIdFilter("")
            }}
          >
            Reset
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent logs</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Level</TableHead>
                <TableHead className="w-[180px]">Source</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, index) => (
                    <TableRow key={`loading-row-${index}`}>
                      <TableCell>
                        <Skeleton className="h-4 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-full max-w-[620px]" />
                      </TableCell>
                    </TableRow>
                  ))
                : sortedLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.level}</TableCell>
                      <TableCell>{log.source}</TableCell>
                      <TableCell className="break-all">{log.message}</TableCell>
                    </TableRow>
                  ))}

              {!isLoading && sortedLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                    No logs found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </section>
  )
}
