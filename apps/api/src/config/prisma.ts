import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { Env, EnvDiagnostics } from "./env";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pgPool?: Pool;
};

const pool =
  globalForPrisma.pgPool ??
  new Pool({
    connectionString: Env.DATABASE_URL
  });

const adapter = new PrismaPg(pool);

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["warn", "error"]
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pgPool = pool;
  globalForPrisma.prisma = prisma;
}

type DbRuntimeDiagnostics = {
  envFilePath: string;
  envFileLoaded: boolean;
  hasDatabaseUrl: boolean;
  currentDatabase?: string;
  currentSchema?: string;
  tables?: Array<{ table_schema: string; table_name: string }>;
};

export async function checkDatabaseConnection() {
  const [{ currentDatabase, currentSchema }] = await prisma.$queryRaw<
    Array<{ currentDatabase: string; currentSchema: string }>
  >`SELECT current_database() AS "currentDatabase", current_schema() AS "currentSchema"`;

  await prisma.setting.findFirst({
    select: { id: true }
  });

  return {
    currentDatabase,
    currentSchema
  };
}

export async function getDatabaseDiagnostics(
  cause?: unknown
): Promise<DbRuntimeDiagnostics> {
  const diagnostics: DbRuntimeDiagnostics = {
    envFilePath: EnvDiagnostics.envFilePath,
    envFileLoaded: EnvDiagnostics.envFileLoaded,
    hasDatabaseUrl: EnvDiagnostics.hasDatabaseUrl
  };

  if (cause instanceof Error) {
    logger.error("Database runtime check failed", {
      message: cause.message,
      name: cause.name
    });
  }

  try {
    const [{ currentDatabase, currentSchema }] = await prisma.$queryRaw<
      Array<{ currentDatabase: string; currentSchema: string }>
    >`SELECT current_database() AS "currentDatabase", current_schema() AS "currentSchema"`;

    diagnostics.currentDatabase = currentDatabase;
    diagnostics.currentSchema = currentSchema;

    diagnostics.tables = await prisma.$queryRaw<
      Array<{ table_schema: string; table_name: string }>
    >`SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_name IN ('Setting', '_prisma_migrations')
      ORDER BY table_schema, table_name`;
  } catch (diagnosticError) {
    if (diagnosticError instanceof Error) {
      logger.error("Failed to collect extra database diagnostics", {
        message: diagnosticError.message,
        name: diagnosticError.name
      });
    }
  }

  return diagnostics;
}

export default prisma;
