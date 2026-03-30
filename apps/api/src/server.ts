import type { Server } from "node:http";
import { createApp } from "./config/app";
import { env } from "./config/env";
import { logger } from "./config/logger";

export function startServer(): Server {
  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info("API server started", {
      nodeEnv: env.NODE_ENV,
      port: env.PORT
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
