import type { Request, Response } from "express";
import { SageService } from "./sage.service";

const sageService = new SageService();

export class SageController {
  async syncInvoices(_request: Request, response: Response): Promise<void> {
    const result = await sageService.syncInvoices();
    response.status(200).json({ success: true, data: result });
  }

  async testRead(_request: Request, response: Response): Promise<void> {
    const result = await sageService.testRead();
    response.status(200).json({ success: true, data: result });
  }
}
