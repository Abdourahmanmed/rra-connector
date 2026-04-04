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
}

export function CompanyInfoStep({ form }: CompanyInfoStepProps) {
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
