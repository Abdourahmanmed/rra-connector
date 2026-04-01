import { Router } from "express";
import { InvoicesController } from "./invoices.controller";

export const invoicesRouter = Router();

const controller = new InvoicesController();

invoicesRouter.get("/api/invoices", (request, response) => controller.list(request, response));
invoicesRouter.get("/api/invoices/:id", (request, response) => controller.getById(request, response));
