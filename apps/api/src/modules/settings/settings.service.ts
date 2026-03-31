import type { SqlAuthType } from "@prisma/client";
import prisma from "../../config/prisma";
import { encryptSecret } from "../../services/secret-crypto.service";
import type { updateSettingsSchema } from "./settings.schema";
import type { z } from "zod";

const SETUP_KEY = "connector_setup";

type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

type ProfileInfo = {
  name?: string;
  tin?: string;
  address?: string;
  phone?: string;
  email?: string;
};

type StoredVsdcSettings = {
  baseUrl?: string;
  deviceId?: string;
  clientId?: string;
  clientSecretEncrypted?: string;
};

type StoredSettingsValue = {
  company?: ProfileInfo;
  publicUrl?: string;
  seller?: ProfileInfo;
  vsdc?: StoredVsdcSettings;
};

type SafeSettingsResponse = {
  company: ProfileInfo;
  publicUrl: string | null;
  seller: ProfileInfo;
  vsdc: {
    baseUrl: string | null;
    deviceId: string | null;
    clientId: string | null;
    hasClientSecret: boolean;
  };
  sql: {
    host: string;
    instance: string | null;
    port: number;
    database: string;
    username: string;
    authType: SqlAuthType;
    hasPassword: boolean;
  };
};

export class SettingsService {
  async getSettings(): Promise<SafeSettingsResponse | null> {
    let setting;

    try {
      setting = await prisma.setting.findFirst({
        where: { key: SETUP_KEY, isActive: true },
        select: {
          sqlServerHost: true,
          sqlServerInstance: true,
          sqlServerPort: true,
          sqlDatabaseName: true,
          sqlUsername: true,
          sqlPasswordEncrypted: true,
          sqlAuthType: true,
          value: true
        }
      });
    } catch (error) {
      throw new Error(
        `Failed to load settings from the database: ${error instanceof Error ? error.message : "Unknown database error"}`
      );
    }

    if (!setting) {
      return null;
    }

    const value = this.parseValue(setting.value);

    return {
      company: value.company ?? {},
      publicUrl: value.publicUrl ?? null,
      seller: value.seller ?? {},
      vsdc: {
        baseUrl: value.vsdc?.baseUrl ?? null,
        deviceId: value.vsdc?.deviceId ?? null,
        clientId: value.vsdc?.clientId ?? null,
        hasClientSecret: Boolean(value.vsdc?.clientSecretEncrypted)
      },
      sql: {
        host: setting.sqlServerHost,
        instance: setting.sqlServerInstance,
        port: setting.sqlServerPort,
        database: setting.sqlDatabaseName,
        username: setting.sqlUsername,
        authType: setting.sqlAuthType,
        hasPassword: Boolean(setting.sqlPasswordEncrypted)
      }
    };
  }

  async updateSettings(input: UpdateSettingsInput): Promise<SafeSettingsResponse | null> {
    let current;

    try {
      current = await prisma.setting.findFirst({
        where: { key: SETUP_KEY, isActive: true },
        select: {
          id: true,
          value: true,
          sqlPasswordEncrypted: true
        }
      });
    } catch (error) {
      throw new Error(
        `Failed to load current settings from the database: ${error instanceof Error ? error.message : "Unknown database error"}`
      );
    }

    if (!current) {
      return null;
    }

    const currentValue = this.parseValue(current.value);

    const mergedValue: StoredSettingsValue = {
      ...currentValue,
      ...(input.company ? { company: { ...(currentValue.company ?? {}), ...input.company } } : {}),
      ...(input.publicUrl !== undefined ? { publicUrl: input.publicUrl } : {}),
      ...(input.seller ? { seller: { ...(currentValue.seller ?? {}), ...input.seller } } : {}),
      ...(input.vsdc
        ? {
            vsdc: {
              ...(currentValue.vsdc ?? {}),
              ...(input.vsdc.baseUrl !== undefined ? { baseUrl: input.vsdc.baseUrl } : {}),
              ...(input.vsdc.deviceId !== undefined ? { deviceId: input.vsdc.deviceId } : {}),
              ...(input.vsdc.clientId !== undefined ? { clientId: input.vsdc.clientId } : {}),
              ...(input.vsdc.clientSecret !== undefined
                ? { clientSecretEncrypted: encryptSecret(input.vsdc.clientSecret) }
                : {})
            }
          }
        : {})
    };

    try {
      await prisma.setting.update({
        where: { id: current.id },
        data: {
          ...(input.sql?.host !== undefined ? { sqlServerHost: input.sql.host } : {}),
          ...(input.sql?.instance !== undefined ? { sqlServerInstance: input.sql.instance || null } : {}),
          ...(input.sql?.port !== undefined ? { sqlServerPort: input.sql.port } : {}),
          ...(input.sql?.database !== undefined ? { sqlDatabaseName: input.sql.database } : {}),
          ...(input.sql?.username !== undefined ? { sqlUsername: input.sql.username } : {}),
          ...(input.sql?.authType !== undefined ? { sqlAuthType: input.sql.authType } : {}),
          sqlPasswordEncrypted:
            input.sql?.password !== undefined
              ? encryptSecret(input.sql.password)
              : current.sqlPasswordEncrypted,
          value: JSON.stringify(mergedValue)
        }
      });
    } catch (error) {
      throw new Error(
        `Failed to update settings in the database: ${error instanceof Error ? error.message : "Unknown database error"}`
      );
    }

    return this.getSettings();
  }

  private parseValue(rawValue: string | null): StoredSettingsValue {
    if (!rawValue) {
      return {};
    }

    try {
      const parsed = JSON.parse(rawValue) as StoredSettingsValue;
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }
}
