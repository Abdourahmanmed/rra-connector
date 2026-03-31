import { Env } from "./env";

type LogLevel = "debug" | "info" | "warn" | "error";

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function shouldLog(targetLevel: LogLevel): boolean {
  return levelOrder[targetLevel] >= levelOrder[Env.LOG_LEVEL];
}

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const context = meta === undefined ? "" : ` ${JSON.stringify(meta)}`;
  return `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}${context}`;
}

export const logger = {
  debug(message: string, meta?: unknown) {
    if (!shouldLog("debug")) return;
    console.debug(formatMessage("debug", message, meta));
  },
  info(message: string, meta?: unknown) {
    if (!shouldLog("info")) return;
    console.info(formatMessage("info", message, meta));
  },
  warn(message: string, meta?: unknown) {
    if (!shouldLog("warn")) return;
    console.warn(formatMessage("warn", message, meta));
  },
  error(message: string, meta?: unknown) {
    if (!shouldLog("error")) return;
    console.error(formatMessage("error", message, meta));
  }
};
