import { Router } from "express";
import { requireAuth } from "./auth.middleware";
import { AuthController } from "./auth.controller";

export const authRouter = Router();

const controller = new AuthController();

authRouter.post("/api/auth/register", (request, response) => controller.register(request, response));
authRouter.post("/api/auth/login", (request, response) => controller.login(request, response));
authRouter.post("/api/auth/logout", requireAuth, (request, response) => controller.logout(request, response));
authRouter.get("/api/auth/me", requireAuth, (request, response) => controller.me(request, response));
