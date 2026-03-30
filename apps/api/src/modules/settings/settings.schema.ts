import { z } from "zod";

const sqlAuthTypeSchema = z.enum(["SQL_AUTH", "WINDOWS_AUTH"]);

const companySchema = z.object({
  name: z.string().min(1).optional(),
  tin: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional()
});

const sellerSchema = z.object({
  name: z.string().min(1).optional(),
  tin: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional()
});

const vsdcSchema = z.object({
  baseUrl: z.string().url().optional(),
  deviceId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  clientSecret: z.string().min(1).optional()
});

const sqlSchema = z.object({
  host: z.string().min(1).optional(),
  instance: z.string().trim().optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  database: z.string().min(1).optional(),
  username: z.string().min(1).optional(),
  password: z.string().min(1).optional(),
  authType: sqlAuthTypeSchema.optional()
});

export const updateSettingsSchema = z
  .object({
    company: companySchema.optional(),
    publicUrl: z.string().url().optional(),
    seller: sellerSchema.optional(),
    vsdc: vsdcSchema.optional(),
    sql: sqlSchema.optional()
  })
  .refine(
    (value) =>
      value.company !== undefined ||
      value.publicUrl !== undefined ||
      value.seller !== undefined ||
      value.vsdc !== undefined ||
      value.sql !== undefined,
    "At least one settings section must be provided"
  );
