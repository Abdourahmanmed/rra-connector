import { Router } from "express";
import { checkDatabaseConnection } from "../../config/prisma";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.status(200).json({
    success: true,
    status: "ok",
    service: "rra-connector-api",
    timestamp: new Date().toISOString()
  });
});

healthRouter.get("/health/db", async (_request, response, next) => {
  try {
    await checkDatabaseConnection();

    response.status(200).json({
      success: true,
      status: "ok",
      database: "connected",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});
