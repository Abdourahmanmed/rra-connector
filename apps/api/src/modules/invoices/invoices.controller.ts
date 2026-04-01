import type { Request, Response } from "express";
import { listInvoicesQuerySchema } from "./invoices.schema";
import { InvoicesService } from "./invoices.service";

const invoicesService = new InvoicesService();

export class InvoicesController {
  async list(request: Request, response: Response): Promise<void> {
    const parsed = listInvoicesQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      response.status(400).json({
        success: false,
        error: "Invalid invoice list query",
        details: parsed.error.flatten()
      });
      return;
    }

    const result = await invoicesService.listInvoices(parsed.data);

    response.status(200).json({
      success: true,
      data: result
    });
  }

  async getById(request: Request, response: Response): Promise<void> {
    const { id } = request.params;
    const invoice = await invoicesService.getInvoiceById(id);

    if (!invoice) {
      response.status(404).json({
        success: false,
        error: "Invoice not found"
      });
      return;
    }

    response.status(200).json({
      success: true,
      data: invoice
    });
  }
}
