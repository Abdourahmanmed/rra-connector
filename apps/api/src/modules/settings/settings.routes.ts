import { Router } from "express";
import { SettingsController } from "./settings.controller";

export const settingsRouter = Router();

const controller = new SettingsController();

settingsRouter.get("/api/settings", (request, response) => controller.get(request, response));
settingsRouter.patch("/api/settings", (request, response) => controller.patch(request, response));
