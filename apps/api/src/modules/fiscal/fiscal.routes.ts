import { Router } from "express";
import { FiscalController } from "./fiscal.controller";

export const fiscalRouter = Router();

const controller = new FiscalController();

fiscalRouter.post("/api/invoices/:id/fiscalize", (request, response) => controller.fiscalizeInvoice(request, response));
