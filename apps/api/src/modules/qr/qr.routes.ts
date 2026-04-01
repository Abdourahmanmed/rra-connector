import { Router } from "express";
import { QrController } from "./qr.controller";

export const qrRouter = Router();

const controller = new QrController();

qrRouter.post("/api/invoices/:id/generate-public-link", (request, response) =>
  controller.generatePublicLink(request, response)
);
