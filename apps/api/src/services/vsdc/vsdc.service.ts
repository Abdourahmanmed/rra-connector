import { decryptSecret } from "../secret-crypto.service";
import { logger } from "../../config/logger";
import prisma from "../../config/prisma";
import type { VsdcSalePayload } from "../../modules/fiscal/fiscal.mapper";

type StoredVsdcSettings = {
  baseUrl?: string;
  deviceId?: string;
  clientId?: string;
  clientSecretEncrypted?: string;
};

type StoredSettingsValue = {
  vsdc?: StoredVsdcSettings;
};

type VsdcConfig = {
  baseUrl: string;
  deviceId: string;
  clientId: string;
  clientSecret: string;
};

export type VsdcSalesResponse = {
  statusCode: number;
  body: unknown;
  externalRequestId: string | null;
};

const SETUP_KEY = "connector_setup";
const DEFAULT_TIMEOUT_MS = 20_000;

export class VsdcService {
  async submitSale(payload: VsdcSalePayload, idempotencyKey: string): Promise<VsdcSalesResponse> {
    const config = await this.loadConfig();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/sales`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "content-type": "application/json",
          "x-device-id": config.deviceId,
          "x-client-id": config.clientId,
          "x-client-secret": config.clientSecret,
          "x-idempotency-key": idempotencyKey
        },
        body: JSON.stringify(payload)
      });

      const body = await this.parseResponseBody(response);

      return {
        statusCode: response.status,
        body,
        externalRequestId: response.headers.get("x-request-id")
      };
    } catch (error) {
      logger.error("VSDC sale submission failed", {
        error: error instanceof Error ? error.message : "Unknown VSDC error"
      });
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async loadConfig(): Promise<VsdcConfig> {
    const setting = await prisma.setting.findFirst({
      where: { key: SETUP_KEY, isActive: true },
      select: { value: true }
    });

    if (!setting?.value) {
      throw new Error("Connector setup is missing; cannot fiscalize without VSDC config");
    }

    const parsed = this.parseValue(setting.value);

    const baseUrl = parsed.vsdc?.baseUrl;
    const deviceId = parsed.vsdc?.deviceId;
    const clientId = parsed.vsdc?.clientId;
    const clientSecretEncrypted = parsed.vsdc?.clientSecretEncrypted;

    if (!baseUrl || !deviceId || !clientId || !clientSecretEncrypted) {
      throw new Error("Incomplete VSDC configuration; cannot fiscalize invoice");
    }

    return {
      baseUrl,
      deviceId,
      clientId,
      clientSecret: decryptSecret(clientSecretEncrypted)
    };
  }

  private parseValue(rawValue: string): StoredSettingsValue {
    try {
      const parsed = JSON.parse(rawValue) as StoredSettingsValue;
      return typeof parsed === "object" && parsed !== null ? parsed : {};
    } catch {
      return {};
    }
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return response.json();
    }

    return { raw: await response.text() };
  }
}
