import type { Request, Response } from "express";
import { resolve } from "node:path";
import { z } from "zod";
import { DocumentsService } from "./documents.service";

const documentsService = new DocumentsService();
const generatePdfParamsSchema = z.object({
  id: z.string().min(1)
});

export class DocumentsController {
  async generateInvoicePdf(request: Request, response: Response): Promise<void> {
    const parsed = generatePdfParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      response.status(400).json({
        success: false,
        error: "Invalid invoice id",
        details: parsed.error.flatten()
      });
      return;
    }

    try {
      const result = await documentsService.generateInvoicePdf(parsed.data.id);

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

  async downloadDocument(request: Request, response: Response): Promise<void> {
    const parsed = generatePdfParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      response.status(400).json({
        success: false,
        error: "Invalid document id",
        details: parsed.error.flatten()
      });
      return;
    }

    try {
      const document = await documentsService.getDocumentFile(parsed.data.id);

      response.setHeader("Content-Type", document.mimeType);
      response.setHeader("Content-Disposition", `inline; filename="${document.fileName}"`);
      response.sendFile(resolve(document.storagePath));
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
