import { z } from "zod";

const sqlAuthTypeSchema = z.enum(["SQL_AUTH", "WINDOWS_AUTH"]);

export const testSqlSchema = z.object({
  host: z.string().min(1, "SQL host is required"),
  instance: z.string().trim().optional(),
  port: z.coerce.number().int().min(1).max(65535).default(1433),
  database: z.string().min(1, "SQL database is required"),
  username: z.string().min(1, "SQL username is required"),
  password: z.string().min(1, "SQL password is required"),
  authType: sqlAuthTypeSchema.default("SQL_AUTH"),
  timeoutMs: z.coerce.number().int().min(500).max(15_000).default(5_000)
});

export const testVsdcSchema = z.object({
  baseUrl: z.string().url("VSDC baseUrl must be a valid URL"),
  deviceId: z.string().min(1, "VSDC deviceId is required"),
  clientId: z.string().min(1, "VSDC clientId is required"),
  clientSecret: z.string().min(1, "VSDC clientSecret is required"),
  timeoutMs: z.coerce.number().int().min(500).max(15_000).default(5_000)
});

export const completeSetupSchema = z.object({
  sql: testSqlSchema,
  vsdc: testVsdcSchema
});
