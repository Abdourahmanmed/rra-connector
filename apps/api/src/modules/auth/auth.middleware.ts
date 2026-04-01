import type { NextFunction, Request, Response } from "express";
import { AuthService } from "./auth.service";

type AuthenticatedUser = {
  id: string;
  email: string;
  role: "ADMIN" | "OPERATOR" | "AUDITOR";
};

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthenticatedUser;
    }
  }
}

const authService = new AuthService();

export function requireAuth(request: Request, response: Response, next: NextFunction): void {
  const authorization = request.header("authorization");

  if (!authorization || !authorization.startsWith("Bearer ")) {
    response.status(401).json({
      success: false,
      error: "Unauthorized"
    });
    return;
  }

  const token = authorization.slice("Bearer ".length).trim();
  const payload = authService.verifyAccessToken(token);

  if (!payload) {
    response.status(401).json({
      success: false,
      error: "Unauthorized"
    });
    return;
  }

  request.authUser = {
    id: payload.sub,
    email: payload.email,
    role: payload.role
  };

  next();
}
