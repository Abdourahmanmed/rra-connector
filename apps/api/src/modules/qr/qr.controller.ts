import type { Request, Response } from "express";
import { QrGenerationError, QrService } from "./qr.service";

const qrService = new QrService();

export class QrController {
  async generatePublicLink(request: Request, response: Response): Promise<void> {
    const { id } = request.params;

    if (!id) {
      response.status(400).json({
        success: false,
        error: "Invoice id is required"
      });
      return;
    }

    try {
      const result = await qrService.generatePublicLink(id);

      response.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error instanceof QrGenerationError) {
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
