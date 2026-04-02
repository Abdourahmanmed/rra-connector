import type { Request, Response } from "express";
import { listLogsQuerySchema } from "./logs.schema";
import { LogsService } from "./logs.service";

const logsService = new LogsService();

export class LogsController {
  async list(request: Request, response: Response): Promise<void> {
    const parsed = listLogsQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      response.status(400).json({
        success: false,
        error: "Invalid logs list query",
        details: parsed.error.flatten()
      });
      return;
    }

    const result = await logsService.list(parsed.data);

    response.status(200).json({
      success: true,
      data: result
    });
  }
}
