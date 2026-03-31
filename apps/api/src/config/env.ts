import "dotenv/config";
import { z } from "zod";

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
});

const ProcessEnv = {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
  LOG_LEVEL: process.env.LOG_LEVEL,
  DATABASE_URL: process.env.DATABASE_URL,
  SECRET_ENCRYPTION_KEY: process.env.SECRET_ENCRYPTION_KEY,
};
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment configuration: ${parsedEnv.error.message}`,
  );
}

export const Env = parsedEnv.data;
