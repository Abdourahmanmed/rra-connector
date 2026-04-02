import { Router } from "express";
import { PublicController } from "./public.controller";

export const publicRouter = Router();

const controller = new PublicController();

publicRouter.get("/api/public/invoice/:token", (request, response) => controller.getPublicInvoice(request, response));
