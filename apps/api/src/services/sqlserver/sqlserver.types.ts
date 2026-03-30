export type SqlAuthType = "SQL_AUTH" | "WINDOWS_AUTH";

export type SqlServerConnectionSettings = {
  host: string;
  instance?: string | null;
  port?: number | null;
  database: string;
  username: string;
  password: string;
  authType: SqlAuthType;
};

export type SqlQueryParamValue = string | number | boolean | Date | Buffer | null;

export type SqlQueryParams = Record<string, SqlQueryParamValue>;

export type SageTableCheckResult = {
  allRequired: boolean;
  existingTables: string[];
  missingTables: string[];
};
