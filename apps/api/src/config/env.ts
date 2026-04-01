import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

export const ENV_FILE_PATH = resolve(__dirname, "../../.env");
const envLoadResult = loadEnv({ path: ENV_FILE_PATH });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SECRET_ENCRYPTION_KEY: z
    .string()
    .min(32, "SECRET_ENCRYPTION_KEY must be at least 32 characters"),
  AUTH_JWT_SECRET: z
    .string()
    .min(32, "AUTH_JWT_SECRET must be at least 32 characters"),
  AUTH_JWT_EXPIRES_IN: z.string().default("8h"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment configuration: ${parsedEnv.error.message}`,
  );
}

export const Env = parsedEnv.data;

export const EnvDiagnostics = {
  envFilePath: ENV_FILE_PATH,
  envFileLoaded: !envLoadResult.error,
  hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
};
