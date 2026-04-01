import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { decryptSecret } from "../secret-crypto.service";
import { logger } from "../../config/logger";
import prisma from "../../config/prisma";
import type {
  StoredSettingsValue,
  VsdcConfig,
  VsdcConnectivityResult,
  VsdcInitializationResult,
  VsdcNormalizedError,
  VsdcNormalizedResponse,
  VsdcRequestConfig,
  VsdcSalesRequest,
  VsdcSalesResponse
} from "./vsdc.types";

const SETUP_KEY = "connector_setup";
const DEFAULT_TIMEOUT_MS = 20_000;

export class VsdcService {
  async testConnectivity(options: VsdcRequestConfig = {}): Promise<VsdcNormalizedResponse<VsdcConnectivityResult>> {
    return this.executeRequest<VsdcConnectivityResult>(
      {
        method: "GET",
        url: "/",
        timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS
      },
      options
    );
  }

  async lookupInitialization(options: VsdcRequestConfig = {}): Promise<VsdcNormalizedResponse<VsdcInitializationResult>> {
    return this.executeRequest<VsdcInitializationResult>(
      {
        method: "GET",
        url: "/initialization",
        timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS
      },
      options
    );
  }

  async submitSale(request: VsdcSalesRequest, options: VsdcRequestConfig = {}): Promise<VsdcSalesResponse> {
    const result = await this.executeRequest<VsdcSalesResponse>(
      {
        method: "POST",
        url: "/sales",
        data: request.payload,
        timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
        headers: {
          "x-idempotency-key": request.idempotencyKey,
          "content-type": "application/json"
        }
      },
      options
    );

    if (result.ok) {
      return result.data;
    }

    const error = new Error(result.error.message);
    error.name = result.error.code;
    throw error;
  }

  private async executeRequest<T extends { statusCode: number; body: unknown; externalRequestId: string | null }>(
    request: AxiosRequestConfig,
    options: VsdcRequestConfig
  ): Promise<VsdcNormalizedResponse<T>> {
    const config = options.config ?? (await this.loadConfig());

    try {
      const response = await axios.request({
        baseURL: config.baseUrl.replace(/\/$/, ""),
        ...request,
        headers: {
          "x-device-id": config.deviceId,
          "x-client-id": config.clientId,
          "x-client-secret": config.clientSecret,
          ...request.headers
        },
        validateStatus: () => true
      });

      const normalizedData = this.mapResponse(response) as T;

      if (response.status >= 200 && response.status < 300) {
        return {
          ok: true,
          statusCode: response.status,
          data: normalizedData,
          externalRequestId: normalizedData.externalRequestId
        };
      }

      return {
        ok: false,
        statusCode: response.status,
        externalRequestId: normalizedData.externalRequestId,
        error: {
          code: "VSDC_HTTP_ERROR",
          message: `VSDC responded with ${response.status}`,
          details: normalizedData.body
        }
      };
    } catch (error) {
      const normalizedError = this.normalizeError(error);
      logger.error("VSDC request failed", {
        error: normalizedError.error.message,
        code: normalizedError.error.code,
        statusCode: normalizedError.statusCode
      });
      return normalizedError;
    }
  }

  private mapResponse(response: AxiosResponse): { statusCode: number; body: unknown; externalRequestId: string | null } {
    return {
      statusCode: response.status,
      body: response.data,
      externalRequestId: this.readExternalRequestId(response)
    };
  }

  private readExternalRequestId(response?: AxiosResponse): string | null {
    const requestId = response?.headers?.["x-request-id"];

    if (Array.isArray(requestId)) {
      return requestId[0] ?? null;
    }

    return typeof requestId === "string" ? requestId : null;
  }

  private normalizeError(error: unknown): VsdcNormalizedError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const statusCode = axiosError.response?.status ?? 0;
      const externalRequestId = this.readExternalRequestId(axiosError.response);

      const isTimeout = axiosError.code === "ECONNABORTED";

      return {
        ok: false,
        statusCode,
        externalRequestId,
        error: {
          code: isTimeout ? "AbortError" : "VSDC_REQUEST_ERROR",
          message: axiosError.message,
          details: axiosError.response?.data
        }
      };
    }

    return {
      ok: false,
      statusCode: 0,
      externalRequestId: null,
      error: {
        code: "VSDC_UNKNOWN_ERROR",
        message: error instanceof Error ? error.message : "Unknown VSDC error"
      }
    };
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
}
