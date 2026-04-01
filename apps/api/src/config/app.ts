import express from "express";
import { healthRouter } from "../modules/health/health.routes";
import { setupRouter } from "../modules/setup/setup.routes";
import { settingsRouter } from "../modules/settings/settings.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { errorHandler } from "../middlewares/error-handler";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.get("/", (_request, response) => {
    response.status(200).json({ message: "RRA Connector API" });
  });

  app.use(healthRouter);
  app.use(setupRouter);
  app.use(authRouter);
  app.use(settingsRouter);

  app.use((_request, response) => {
    response.status(404).json({
      success: false,
      error: "Not Found"
    });
  });

  app.use(errorHandler);

  return app;
}
