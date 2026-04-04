import type { UseFormReturn } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { SetupFormValues } from "@/src/components/setup/SetupWizard"

type VsdcStepProps = {
  form: UseFormReturn<SetupFormValues>
  onTest: () => Promise<void>
  isTesting: boolean
}

export function VsdcStep({ form, onTest, isTesting }: VsdcStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="vsdc.tin"
          render={({ field }) => (
            <FormItem>
              <FormLabel>TIN</FormLabel>
              <FormControl>
                <Input placeholder="100123456" {...field} />
              </FormControl>
              <FormDescription>Used as VSDC client identifier.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vsdc.branchId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Branch ID</FormLabel>
              <FormControl>
                <Input placeholder="BR001" {...field} />
              </FormControl>
              <FormDescription>Used as VSDC client secret.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vsdc.deviceSerialNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Device Serial Number</FormLabel>
              <FormControl>
                <Input placeholder="SDC-0001" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="vsdc.vsdcBaseUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>VSDC Base URL</FormLabel>
              <FormControl>
                <Input placeholder="https://vsdc.example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <Button type="button" variant="secondary" onClick={onTest} disabled={isTesting}>
        {isTesting ? "Testing VSDC connection..." : "Test VSDC connection"}
      </Button>
    </div>
  )
}
