import type { Request, Response } from "express";
import { DashboardService } from "./dashboard.service";

const dashboardService = new DashboardService();

export class DashboardController {
  async getSummary(_request: Request, response: Response): Promise<void> {
    const summary = await dashboardService.getSummary();

    response.status(200).json({
      success: true,
      data: summary
    });
  }
}
