import { SetupWizard } from "@/src/components/setup/SetupWizard"

export default function SetupPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-57px)] w-full max-w-6xl items-center px-4 py-10">
      <SetupWizard />
    </main>
  )
}
