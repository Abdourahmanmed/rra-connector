import { z } from "zod";

export const fiscalizeInvoiceParamsSchema = z.object({
  id: z.string().trim().min(1, "Invoice id is required")
});
