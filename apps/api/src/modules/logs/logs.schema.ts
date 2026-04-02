import { z } from "zod";

export const logLevelSchema = z.enum(["DEBUG", "INFO", "WARN", "ERROR"]);
export const logSourceSchema = z.enum(["IMPORTER", "FISCAL_API", "DOCUMENT_ENGINE", "QR_ENGINE", "SYNC", "SYSTEM"]);

export const listLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  level: logLevelSchema.optional(),
  source: logSourceSchema.optional(),
  invoiceId: z.string().trim().min(1).max(64).optional()
});

export type ListLogsQuery = z.infer<typeof listLogsQuerySchema>;
