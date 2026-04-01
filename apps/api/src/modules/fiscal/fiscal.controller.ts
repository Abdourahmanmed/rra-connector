import type { Request, Response } from "express";
import { fiscalizeInvoiceParamsSchema } from "./fiscal.schema";
import { FiscalService } from "./fiscal.service";

const fiscalService = new FiscalService();

export class FiscalController {
  async fiscalizeInvoice(request: Request, response: Response): Promise<void> {
    const parsed = fiscalizeInvoiceParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      response.status(400).json({
        success: false,
        error: "Invalid invoice id",
        details: parsed.error.flatten()
      });
      return;
    }

    try {
      const result = await fiscalService.fiscalizeInvoice(parsed.data.id);

      response.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof Error && "statusCode" in error) {
        response.status((error as { statusCode: number }).statusCode).json({
          success: false,
          error: error.message,
          code: (error as { code?: string }).code
        });
        return;
      }

      throw error;
    }
  }
}
