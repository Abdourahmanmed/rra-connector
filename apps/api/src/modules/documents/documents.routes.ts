import { Router } from "express";
import { DocumentsController } from "./documents.controller";

export const documentsRouter = Router();

const controller = new DocumentsController();

documentsRouter.post("/api/invoices/:id/generate-pdf", (request, response) =>
  controller.generateInvoicePdf(request, response)
);
documentsRouter.get("/api/documents/:id/download", (request, response) => controller.downloadDocument(request, response));
