import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import type { SqlAuthType } from "@prisma/client";
import prisma from "../../config/prisma";
import { Env } from "../../config/env";
import { encryptSecret } from "../../services/secret-crypto.service";
import type { updateSettingsSchema } from "./settings.schema";
import type { z } from "zod";

const SETUP_KEY = "connector_setup";

const ALLOWED_MIME_TYPES = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
  ["image/svg+xml", "svg"]
]);

type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

type ProfileInfo = {
  name?: string;
  tin?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  logoPath?: string;
  bankDetails?: string;
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

type UploadLogoInput = {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
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
          value: true,
          companyLogoPath: true,
          companyLogoUrl: true
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
      company: { ...(value.company ?? {}), ...(value.company?.logoPath ? {} : { logoPath: setting.companyLogoPath ?? undefined }), ...(value.company?.logoUrl ? {} : { logoUrl: setting.companyLogoUrl ?? undefined }) },
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

  async updateLogo(input: UploadLogoInput): Promise<{ logoUrl: string; logoPath: string; fileName: string }> {
    const fileExtension = ALLOWED_MIME_TYPES.get(input.mimeType);

    if (!fileExtension) {
      throw new Error("Unsupported image format. Allowed formats: png, jpg/jpeg, webp, svg.");
    }

    if (input.fileBuffer.length > Env.MAX_LOGO_FILE_SIZE_BYTES) {
      throw new Error(`Logo file exceeds max size of ${Env.MAX_LOGO_FILE_SIZE_BYTES} bytes.`);
    }

    if (input.mimeType === "image/svg+xml") {
      const svgContent = input.fileBuffer.toString("utf8").toLowerCase();
      if (svgContent.includes("<script") || svgContent.includes("onload=") || svgContent.includes("onerror=")) {
        throw new Error("SVG file contains unsafe content.");
      }
    }

    const setting = await prisma.setting.findFirst({
      where: { key: SETUP_KEY, isActive: true },
      select: { id: true, value: true }
    });

    if (!setting) {
      throw new Error("Setup must be completed before uploading a logo.");
    }

    const storageDir = resolve(Env.LOGOS_STORAGE_PATH);
    await mkdir(storageDir, { recursive: true });

    const normalizedName = input.fileName.replaceAll(/[^a-zA-Z0-9_.-]/g, "-");
    const baseName = normalizedName.replace(extname(normalizedName), "") || "logo";
    const fileName = `${baseName}-${Date.now()}-${randomUUID()}.${fileExtension}`;
    const logoPath = join(storageDir, fileName);
    const logoUrl = `/api/settings/logo/${fileName}`;

    await writeFile(logoPath, input.fileBuffer);

    const parsed = this.parseValue(setting.value);
    const previousPaths = [parsed.company?.logoPath, parsed.seller?.logoPath].filter((value): value is string => Boolean(value));

    parsed.company = { ...(parsed.company ?? {}), logoPath, logoUrl };
    parsed.seller = { ...(parsed.seller ?? {}), logoPath, logoUrl };

    await prisma.setting.update({
      where: { id: setting.id },
      data: {
        value: JSON.stringify(parsed),
        companyLogoPath: logoPath,
        companyLogoUrl: logoUrl
      }
    });

    for (const previousPath of previousPaths) {
      if (previousPath !== logoPath && previousPath.startsWith(storageDir)) {
        await rm(previousPath, { force: true });
      }
    }

    return { logoUrl, logoPath, fileName };
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
          companyLogoPath: input.company?.logoPath ?? input.seller?.logoPath,
          companyLogoUrl: input.company?.logoUrl ?? input.seller?.logoUrl,
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

  async readLogo(fileName: string): Promise<{ content: Buffer; mimeType: string }> {
    const safeFileName = fileName.replaceAll(/[^a-zA-Z0-9_.-]/g, "");
    if (!safeFileName) {
      throw new Error("Invalid logo filename");
    }

    const filePath = join(resolve(Env.LOGOS_STORAGE_PATH), safeFileName);
    const extension = extname(safeFileName).toLowerCase();
    const mimeType =
      extension === ".png"
        ? "image/png"
        : extension === ".jpg" || extension === ".jpeg"
          ? "image/jpeg"
          : extension === ".webp"
            ? "image/webp"
            : extension === ".svg"
              ? "image/svg+xml"
              : null;

    if (!mimeType) {
      throw new Error("Unsupported logo extension");
    }

    const content = await readFile(filePath);
    return { content, mimeType };
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
