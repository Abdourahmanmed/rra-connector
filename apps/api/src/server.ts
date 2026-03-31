import type { Server } from "node:http";
import { createApp } from "./config/app";
import { Env } from "./config/env";
import { logger } from "./config/logger";

export function startServer(): Server {
  const app = createApp();

  const server = app.listen(Env.PORT, () => {
    logger.info("API server started", {
      nodeEnv: Env.NODE_ENV,
      port: Env.PORT,
    });
  });

  const shutdown = () => {
    logger.info("Graceful shutdown started");

    server.close(() => {
      logger.info("HTTP server closed");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  return server;
}
