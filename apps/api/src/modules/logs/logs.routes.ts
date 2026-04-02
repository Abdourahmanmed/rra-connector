import { Router } from "express";
import { LogsController } from "./logs.controller";

export const logsRouter = Router();

const controller = new LogsController();

logsRouter.get("/api/logs", (request, response) => controller.list(request, response));
