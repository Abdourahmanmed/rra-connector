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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { SetupFormValues } from "@/lib/setup"

type SqlServerStepProps = {
  form: UseFormReturn<SetupFormValues>
  onTest: () => Promise<void>
  isTesting: boolean
}

export function SqlServerStep({ form, onTest, isTesting }: SqlServerStepProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={form.control}
          name="sql.host"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Host</FormLabel>
              <FormControl>
                <Input placeholder="192.168.1.10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sql.instance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instance</FormLabel>
              <FormControl>
                <Input placeholder="SQLEXPRESS" {...field} />
              </FormControl>
              <FormDescription>Optional when using explicit port.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sql.port"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Port</FormLabel>
              <FormControl>
                <Input type="number" placeholder="1433" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sql.database"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Database</FormLabel>
              <FormControl>
                <Input placeholder="Sage100" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sql.username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="sa" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="sql.password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="sql.authType"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Authentication Type</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select auth type" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="SQL_AUTH">SQL Authentication</SelectItem>
                <SelectItem value="WINDOWS_AUTH">Windows Authentication</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <Button type="button" variant="secondary" onClick={onTest} disabled={isTesting}>
        {isTesting ? "Testing SQL connection..." : "Test SQL connection"}
      </Button>
    </div>
  )
}
