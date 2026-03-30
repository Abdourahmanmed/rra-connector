import type { Request, Response } from "express";
import { completeSetupSchema, testSqlSchema, testVsdcSchema } from "./setup.schema";
import { SetupService } from "./setup.service";

const setupService = new SetupService();

export class SetupController {
  async status(_request: Request, response: Response): Promise<void> {
    const status = await setupService.getStatus();
    response.status(200).json({ success: true, data: status });
  }

  async testSql(request: Request, response: Response): Promise<void> {
    const parsed = testSqlSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        success: false,
        error: "Invalid SQL configuration payload",
        details: parsed.error.flatten()
      });
      return;
    }

    const result = await setupService.testSqlConnection(parsed.data);
    response.status(result.success ? 200 : 400).json(result);
  }

  async testVsdc(request: Request, response: Response): Promise<void> {
    const parsed = testVsdcSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        success: false,
        error: "Invalid VSDC configuration payload",
        details: parsed.error.flatten()
      });
      return;
    }

    const result = await setupService.testVsdcConnectivity(parsed.data);
    response.status(result.success ? 200 : 400).json(result);
  }

  async complete(request: Request, response: Response): Promise<void> {
    const parsed = completeSetupSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        success: false,
        error: "Invalid setup payload",
        details: parsed.error.flatten()
      });
      return;
    }

    const [sqlResult, vsdcResult] = await Promise.all([
      setupService.testSqlConnection(parsed.data.sql),
      setupService.testVsdcConnectivity(parsed.data.vsdc)
    ]);

    if (!sqlResult.success || !vsdcResult.success) {
      response.status(400).json({
        success: false,
        error: "Setup validation failed",
        details: {
          sql: sqlResult,
          vsdc: vsdcResult
        }
      });
      return;
    }

    const result = await setupService.completeSetup(parsed.data);
    response.status(200).json(result);
  }
}
