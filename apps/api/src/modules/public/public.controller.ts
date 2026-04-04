import type { Request, Response } from "express";
import { z } from "zod";
import { PublicInvoiceError, PublicService } from "./public.service";

const publicService = new PublicService();
const getPublicInvoiceSchema = z.object({
  token: z.string().min(1)
});

const getPublicInvoicePdfSchema = z.object({
  token: z.string().min(1)
});

const getPublicInvoicePdfQuerySchema = z.object({
  documentId: z.string().min(1).optional()
});

export class PublicController {
  async getPublicInvoice(request: Request, response: Response): Promise<void> {
    const parsed = getPublicInvoiceSchema.safeParse(request.params);

    if (!parsed.success) {
      response.status(400).json({
        success: false,
        error: "Invalid public invoice token",
        details: parsed.error.flatten()
      });
      return;
    }

    try {
      const data = await publicService.getPublicInvoiceByToken(parsed.data.token);

      response.status(200).json({
        success: true,
        data
      });
    } catch (error) {
      if (error instanceof PublicInvoiceError) {
        response.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code
        });
        return;
      }

      throw error;
    }
  }

  async getPublicInvoicePdf(request: Request, response: Response): Promise<void> {
    const parsedParams = getPublicInvoicePdfSchema.safeParse(request.params);
    const parsedQuery = getPublicInvoicePdfQuerySchema.safeParse(request.query);

    if (!parsedParams.success || !parsedQuery.success) {
      response.status(400).json({
        success: false,
        error: "Invalid request parameters"
      });
      return;
    }

    try {
      const document = await publicService.getPublicInvoicePdfByToken({
        token: parsedParams.data.token,
        documentId: parsedQuery.data.documentId
      });

      response.setHeader("Content-Type", document.mimeType);
      response.setHeader("Content-Disposition", `inline; filename=\"${document.fileName}\"`);
      response.status(200).send(document.content);
    } catch (error) {
      if (error instanceof PublicInvoiceError) {
        response.status(error.statusCode).json({
          success: false,
          error: error.message,
          code: error.code
        });
        return;
      }

      throw error;
    }
  }
}
