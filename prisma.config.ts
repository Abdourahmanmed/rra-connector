import "dotenv/config";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

const configDir = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(configDir, ".env") });

if (process.env.PRISMA_DEBUG_ENV === "1") {
  // Temporary debug aid for local diagnosis.
  console.log(`[prisma.config] DATABASE_URL defined: ${Boolean(process.env.DATABASE_URL)}`);
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
