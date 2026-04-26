import type { Request, Response } from "express";
import { parseMultipartFile } from "./multipart";
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

  async uploadLogo(request: Request, response: Response): Promise<void> {
    try {
      const file = await parseMultipartFile(request, "logo");
      const result = await settingsService.updateLogo({
        fileName: file.fileName,
        mimeType: file.mimeType,
        fileBuffer: file.buffer
      });

      response.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      response.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : "Logo upload failed"
      });
    }
  }

  async getLogo(request: Request, response: Response): Promise<void> {
    try {
      const logo = await settingsService.readLogo(request.params.filename);
      response.setHeader("Content-Type", logo.mimeType);
      response.setHeader("Cache-Control", "public, max-age=86400");
      response.status(200).send(logo.content);
    } catch {
      response.status(404).json({
        success: false,
        error: "Logo not found"
      });
    }
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
