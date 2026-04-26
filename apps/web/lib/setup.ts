import { z } from "zod"

export const setupSchema = z.object({
  sql: z.object({
    host: z.string().min(1, "SQL host is required"),
    instance: z.string().optional(),
    port: z.coerce.number().int().min(1).max(65535),
    database: z.string().min(1, "Database is required"),
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    authType: z.enum(["SQL_AUTH", "WINDOWS_AUTH"]),
  }),
  vsdc: z.object({
    tin: z.string().min(1, "TIN is required"),
    branchId: z.string().min(1, "Branch ID is required"),
    deviceSerialNumber: z.string().min(1, "Device serial number is required"),
    vsdcBaseUrl: z.string().url("Provide a valid VSDC URL"),
  }),
  company: z.object({
    companyName: z.string().min(1, "Company name is required"),
    sellerName: z.string().min(1, "Seller name is required"),
    sellerAddress: z.string().min(1, "Seller address is required"),
    sellerPhone: z.string().min(1, "Seller phone is required"),
    sellerEmail: z.string().email("Provide a valid seller email"),
    publicBaseUrl: z.string().url("Provide a valid public URL"),
    logoUrl: z.string().optional(),
    logoPath: z.string().optional(),
    bankDetails: z.string().optional(),
    website: z.string().url("Provide a valid website URL").optional().or(z.literal("")),
    adminPassword: z.string().min(8, "Admin password must be at least 8 characters"),
  }),
})

export type SetupFormValues = z.infer<typeof setupSchema>

export type ApiResult = {
  success: boolean
  message?: string
  error?: string
  details?: unknown
}

export const setupDefaultValues: SetupFormValues = {
  sql: {
    host: "",
    instance: "",
    port: 1433,
    database: "",
    username: "",
    password: "",
    authType: "SQL_AUTH",
  },
  vsdc: {
    tin: "",
    branchId: "",
    deviceSerialNumber: "",
    vsdcBaseUrl: "",
  },
  company: {
    companyName: "",
    sellerName: "",
    sellerAddress: "",
    sellerPhone: "",
    sellerEmail: "",
    publicBaseUrl: "",
    logoUrl: "",
    logoPath: "",
    bankDetails: "",
    website: "",
    adminPassword: "",
  },
}

export function mapVsdcPayload(vsdc: { tin: string; branchId?: string; deviceSerialNumber: string; vsdcBaseUrl: string }) {
  return {
    baseUrl: vsdc.vsdcBaseUrl,
    deviceId: vsdc.deviceSerialNumber,
    clientId: vsdc.tin,
    clientSecret: vsdc.branchId,
  }
}

export function mapSettingsPayload(values: SetupFormValues) {
  return {
    company: {
      name: values.company.companyName,
      tin: values.vsdc.tin,
      address: values.company.sellerAddress,
      phone: values.company.sellerPhone,
      email: values.company.sellerEmail,
      website: values.company.website || undefined,
      logoUrl: values.company.logoUrl || undefined,
      logoPath: values.company.logoPath || undefined,
      bankDetails: values.company.bankDetails || undefined,
    },
    publicUrl: values.company.publicBaseUrl,
    seller: {
      name: values.company.sellerName,
      tin: values.vsdc.tin,
      address: values.company.sellerAddress,
      phone: values.company.sellerPhone,
      email: values.company.sellerEmail,
      website: values.company.website || undefined,
      logoUrl: values.company.logoUrl || undefined,
      logoPath: values.company.logoPath || undefined,
      bankDetails: values.company.bankDetails || undefined,
    },
  }
}
