import express from "express";
import { healthRouter } from "../modules/health/health.routes";
import { setupRouter } from "../modules/setup/setup.routes";
import { settingsRouter } from "../modules/settings/settings.routes";
import { authRouter } from "../modules/auth/auth.routes";
import { sageRouter } from "../modules/sage/sage.routes";
import { invoicesRouter } from "../modules/invoices/invoices.routes";
import { fiscalRouter } from "../modules/fiscal/fiscal.routes";
import { documentsRouter } from "../modules/documents/documents.routes";
import { qrRouter } from "../modules/qr/qr.routes";
import { publicRouter } from "../modules/public/public.routes";
import { dashboardRouter } from "../modules/dashboard/dashboard.routes";
import { logsRouter } from "../modules/logs/logs.routes";
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
  app.use(sageRouter);
  app.use(invoicesRouter);
  app.use(fiscalRouter);
  app.use(documentsRouter);
  app.use(qrRouter);
  app.use(publicRouter);
  app.use(dashboardRouter);
  app.use(logsRouter);

  app.use((_request, response) => {
    response.status(404).json({
      success: false,
      error: "Not Found"
    });
  });

  app.use(errorHandler);

  return app;
}
