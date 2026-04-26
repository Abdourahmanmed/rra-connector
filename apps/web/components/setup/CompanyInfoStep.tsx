import type { ChangeEvent } from "react"
import type { UseFormReturn } from "react-hook-form"

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import type { SetupFormValues } from "@/lib/setup"

type CompanyInfoStepProps = {
  form: UseFormReturn<SetupFormValues>
  logoPreviewUrl?: string | null
  onLogoChange: (event: ChangeEvent<HTMLInputElement>) => void
}

export function CompanyInfoStep({ form, logoPreviewUrl, onLogoChange }: CompanyInfoStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="company.companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Trading Ltd" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company.sellerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seller Name</FormLabel>
              <FormControl>
                <Input placeholder="Main Branch Seller" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company.sellerAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seller Address</FormLabel>
              <FormControl>
                <Input placeholder="Kigali, Rwanda" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company.sellerPhone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seller Phone</FormLabel>
              <FormControl>
                <Input placeholder="+2507..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company.sellerEmail"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seller Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="seller@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company.publicBaseUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Public Base URL</FormLabel>
              <FormControl>
                <Input placeholder="https://connector.company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />


        <FormField
          control={form.control}
          name="company.website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website URL</FormLabel>
              <FormControl>
                <Input placeholder="https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
          <FormLabel>Invoice Logo</FormLabel>
          <FormControl>
            <Input type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/*" onChange={onLogoChange} />
          </FormControl>
          {logoPreviewUrl ? <img src={logoPreviewUrl} alt="Logo preview" className="mt-2 h-20 w-20 rounded border object-contain p-1" /> : null}
        </FormItem>

        <FormField
          control={form.control}
          name="company.bankDetails"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Bank Details (one account per line)</FormLabel>
              <FormControl>
                <Input placeholder="Bank of Kigali - 1000..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company.adminPassword"
          render={({ field }) => (
            <FormItem className="md:col-span-2">
              <FormLabel>Admin Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  )
}
