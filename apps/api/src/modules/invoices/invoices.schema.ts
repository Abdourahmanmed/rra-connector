import { FiscalStatus, InvoiceImportStatus } from "@prisma/client";
import { z } from "zod";

export const listInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  fiscalStatus: z.nativeEnum(FiscalStatus).optional(),
  importStatus: z.nativeEnum(InvoiceImportStatus).optional(),
  search: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional(),
  sortBy: z.enum(["invoiceDate", "totalAmount", "createdAt"]).default("invoiceDate"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});
