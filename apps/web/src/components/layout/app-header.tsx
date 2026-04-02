import { APP_NAME } from "@/src/lib/constants"

export function AppHeader() {
  return (
    <header className="border-b px-4 py-3">
      <p className="text-sm font-medium">{APP_NAME}</p>
    </header>
  )
}
