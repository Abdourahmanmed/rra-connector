import { Router } from "express";
import { SettingsController } from "./settings.controller";

export const settingsRouter = Router();

const controller = new SettingsController();

settingsRouter.get("/api/settings", (request, response) => controller.get(request, response));
settingsRouter.patch("/api/settings", (request, response) => controller.patch(request, response));
settingsRouter.post("/api/settings/logo", (request, response) => controller.uploadLogo(request, response));
settingsRouter.get("/api/settings/logo/:filename", (request, response) => controller.getLogo(request, response));
