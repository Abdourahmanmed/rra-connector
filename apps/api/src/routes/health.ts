import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.status(200).json({
    success: true,
    service: "rra-connector-api",
    status: "ok"
  });
});
