import { Router } from "express";
import { SageController } from "./sage.controller";

export const sageRouter = Router();

const controller = new SageController();

sageRouter.post("/api/invoices/sync", (request, response) => controller.syncInvoices(request, response));
sageRouter.get("/api/sage/test-read", (request, response) => controller.testRead(request, response));
