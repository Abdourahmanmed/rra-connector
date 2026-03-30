import express from "express";
import { errorHandler } from "./middleware/error-handler";
import { healthRouter } from "./routes/health";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/api", healthRouter);

  app.use(errorHandler);

  return app;
}
