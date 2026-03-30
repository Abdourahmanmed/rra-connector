import sql from "mssql";
import { db } from "../../config/db";
import { logger } from "../../config/logger";
import { decryptSecret } from "../secret-crypto.service";
import type {
  SageTableCheckResult,
  SqlQueryParams,
  SqlServerConnectionSettings
} from "./sqlserver.types";

const SETUP_KEY = "connector_setup";
const DEFAULT_SAGE_TABLES = ["C_PIECE", "F_DOCENTETE", "F_DOCLIGNE"];

export class SqlServerService {
  async testConnection(settings?: SqlServerConnectionSettings): Promise<void> {
    await this.withConnection(settings, async (pool) => {
      await pool.request().query("SELECT 1 AS healthy");
    });
  }

  async runQuery<T = unknown>(
    query: string,
    params?: SqlQueryParams,
    settings?: SqlServerConnectionSettings
  ): Promise<T[]> {
    if (!query.trim()) {
      throw new Error("Query text cannot be empty.");
    }

    return this.withConnection(settings, async (pool) => {
      const request = pool.request();

      for (const [key, value] of Object.entries(params ?? {})) {
        request.input(key, value as never);
      }

      const result = await request.query<T>(query);
      return result.recordset;
    });
  }

  async checkSageTablesExist(
    tableNames: string[] = DEFAULT_SAGE_TABLES,
    settings?: SqlServerConnectionSettings
  ): Promise<SageTableCheckResult> {
    const normalized = [...new Set(tableNames.map((table) => table.trim()).filter(Boolean))];

    if (normalized.length === 0) {
      throw new Error("At least one table name is required.");
    }

    return this.withConnection(settings, async (pool) => {
      const request = pool.request();
      const placeholders: string[] = [];

      normalized.forEach((table, index) => {
        const paramName = `table_${index}`;
        request.input(paramName, table);
        placeholders.push(`@${paramName}`);
      });

      const result = await request.query<{ tableName: string }>(`
        SELECT TABLE_NAME AS tableName
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME IN (${placeholders.join(", ")})
      `);

      const existing = result.recordset.map((row) => row.tableName);
      const existingSet = new Set(existing.map((table) => table.toLowerCase()));
      const missing = normalized.filter((table) => !existingSet.has(table.toLowerCase()));

      return {
        allRequired: missing.length === 0,
        existingTables: existing,
        missingTables: missing
      };
    });
  }

  async getSavedSettings(): Promise<SqlServerConnectionSettings> {
    const saved = await db.setting.findFirst({
      where: { key: SETUP_KEY, isActive: true },
      select: {
        sqlServerHost: true,
        sqlServerInstance: true,
        sqlServerPort: true,
        sqlDatabaseName: true,
        sqlUsername: true,
        sqlPasswordEncrypted: true,
        sqlAuthType: true
      }
    });

    if (!saved) {
      throw new Error("SQL Server settings are not configured yet.");
    }

    let decryptedPassword: string;

    try {
      decryptedPassword = decryptSecret(saved.sqlPasswordEncrypted);
    } catch (error) {
      logger.error("Failed to decrypt saved SQL Server password", {
        error: error instanceof Error ? error.message : "Unknown decryption error"
      });
      throw new Error("Stored SQL Server credentials could not be decrypted.");
    }

    return {
      host: saved.sqlServerHost,
      instance: saved.sqlServerInstance,
      port: saved.sqlServerPort,
      database: saved.sqlDatabaseName,
      username: saved.sqlUsername,
      password: decryptedPassword,
      authType: saved.sqlAuthType
    };
  }

  private async withConnection<T>(
    settings: SqlServerConnectionSettings | undefined,
    operation: (pool: sql.ConnectionPool) => Promise<T>
  ): Promise<T> {
    const effectiveSettings = settings ?? (await this.getSavedSettings());
    const config = this.buildConfig(effectiveSettings);
    const pool = new sql.ConnectionPool(config);

    try {
      await pool.connect();
      return await operation(pool);
    } catch (error) {
      logger.error("SQL Server operation failed", {
        host: effectiveSettings.host,
        database: effectiveSettings.database,
        authType: effectiveSettings.authType,
        error: error instanceof Error ? error.message : "Unknown SQL Server error"
      });

      const reason = error instanceof Error ? error.message : "Unknown SQL Server error";
      throw new Error(`SQL Server operation failed: ${reason}`);
    } finally {
      if (pool.connected) {
        await pool.close();
      }
    }
  }

  private buildConfig(settings: SqlServerConnectionSettings): sql.config {
    if (!settings.host.trim()) {
      throw new Error("SQL Server host is required.");
    }

    if (!settings.database.trim()) {
      throw new Error("SQL Server database is required.");
    }

    if (!settings.username.trim()) {
      throw new Error("SQL Server username is required.");
    }

    if (!settings.password) {
      throw new Error("SQL Server password is required.");
    }

    const instanceName = settings.instance?.trim() || undefined;

    const baseConfig: sql.config = {
      server: settings.host.trim(),
      database: settings.database.trim(),
      options: {
        encrypt: false,
        trustServerCertificate: true,
        ...(instanceName ? { instanceName } : {}),
        ...(!instanceName && settings.port ? { port: settings.port } : {})
      },
      connectionTimeout: 10_000,
      requestTimeout: 30_000
    };

    if (settings.authType === "WINDOWS_AUTH") {
      return {
        ...baseConfig,
        authentication: {
          type: "ntlm",
          options: {
            userName: settings.username.trim(),
            password: settings.password,
            domain: ""
          }
        }
      };
    }

    return {
      ...baseConfig,
      user: settings.username.trim(),
      password: settings.password
    };
  }
}

export const sqlServerService = new SqlServerService();
