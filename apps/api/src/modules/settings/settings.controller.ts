import type { Request, Response } from "express";
import { updateSettingsSchema } from "./settings.schema";
import { SettingsService } from "./settings.service";

const settingsService = new SettingsService();

export class SettingsController {
  async get(_request: Request, response: Response): Promise<void> {
    const settings = await settingsService.getSettings();

    if (!settings) {
      response.status(404).json({
        success: false,
        error: "Settings are not configured yet"
      });
      return;
    }

    response.status(200).json({
      success: true,
      data: settings
    });
  }

  async patch(request: Request, response: Response): Promise<void> {
    const parsed = updateSettingsSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        success: false,
        error: "Invalid settings payload",
        details: parsed.error.flatten()
      });
      return;
    }

    const settings = await settingsService.updateSettings(parsed.data);

    if (!settings) {
      response.status(404).json({
        success: false,
        error: "Settings are not configured yet"
      });
      return;
    }

    response.status(200).json({
      success: true,
      data: settings
    });
  }
}
