import { Router } from "express";
import {
  checkDatabaseConnection,
  getDatabaseDiagnostics
} from "../../config/prisma";

export const healthRouter = Router();

healthRouter.get("/health", (_request, response) => {
  response.status(200).json({
    success: true,
    status: "ok",
    service: "rra-connector-api",
    timestamp: new Date().toISOString()
  });
});

healthRouter.get("/health/db", async (_request, response) => {
  try {
    const dbState = await checkDatabaseConnection();

    response.status(200).json({
      success: true,
      status: "ok",
      database: "connected",
      details: dbState,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const diagnostics = await getDatabaseDiagnostics(error);

    response.status(503).json({
      success: false,
      status: "error",
      database: "unavailable",
      error: error instanceof Error ? error.message : "Database check failed",
      diagnostics,
      timestamp: new Date().toISOString()
    });
  }
});
