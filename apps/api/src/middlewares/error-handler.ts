import type { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";

export function errorHandler(
  error: unknown,
  request: Request,
  response: Response,
  _next: NextFunction
): void {
  const message = error instanceof Error ? error.message : "Internal server error";

  logger.error("Unhandled request error", {
    path: request.path,
    method: request.method,
    error: message
  });

  response.status(500).json({
    success: false,
    error: message
  });
}
