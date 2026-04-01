import type { Request, Response } from "express";
import { loginSchema } from "./auth.schema";
import { AuthService } from "./auth.service";

const authService = new AuthService();

export class AuthController {
  async login(request: Request, response: Response): Promise<void> {
    const parsed = loginSchema.safeParse(request.body);

    if (!parsed.success) {
      response.status(400).json({
        success: false,
        error: "Invalid login payload",
        details: parsed.error.flatten()
      });
      return;
    }

    const result = await authService.login(parsed.data);

    if (!result.success) {
      response.status(401).json({
        success: false,
        error: result.error
      });
      return;
    }

    response.status(200).json({
      success: true,
      data: result.data
    });
  }

  async logout(_request: Request, response: Response): Promise<void> {
    response.status(200).json({
      success: true,
      message: "Logged out successfully"
    });
  }

  async me(request: Request, response: Response): Promise<void> {
    const authUser = request.authUser;

    if (!authUser) {
      response.status(401).json({
        success: false,
        error: "Unauthorized"
      });
      return;
    }

    const user = await authService.getUserById(authUser.id);

    if (!user) {
      response.status(401).json({
        success: false,
        error: "Unauthorized"
      });
      return;
    }

    response.status(200).json({
      success: true,
      data: user
    });
  }
}
