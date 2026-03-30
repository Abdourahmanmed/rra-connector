import { Router } from "express";
import { SetupController } from "./setup.controller";

export const setupRouter = Router();

const controller = new SetupController();

setupRouter.get("/api/setup/status", (request, response) => controller.status(request, response));
setupRouter.post("/api/setup/test-sql", (request, response) => controller.testSql(request, response));
setupRouter.post("/api/setup/test-vsdc", (request, response) => controller.testVsdc(request, response));
setupRouter.post("/api/setup/complete", (request, response) => controller.complete(request, response));
