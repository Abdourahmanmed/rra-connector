import type { VsdcSalePayload } from "../../modules/fiscal/fiscal.mapper";

export type StoredVsdcSettings = {
  baseUrl?: string;
  deviceId?: string;
  clientId?: string;
  clientSecretEncrypted?: string;
};

export type StoredSettingsValue = {
  vsdc?: StoredVsdcSettings;
};

export type VsdcConfig = {
  baseUrl: string;
  deviceId: string;
  clientId: string;
  clientSecret: string;
};

export type VsdcRequestConfig = {
  config?: VsdcConfig;
  timeoutMs?: number;
};

export type VsdcConnectivityResult = {
  statusCode: number;
  body: unknown;
  externalRequestId: string | null;
};

export type VsdcInitializationResult = {
  statusCode: number;
  body: unknown;
  externalRequestId: string | null;
};

export type VsdcSalesRequest = {
  payload: VsdcSalePayload;
  idempotencyKey: string;
};

export type VsdcSalesResponse = {
  statusCode: number;
  body: unknown;
  externalRequestId: string | null;
};

export type VsdcNormalizedSuccess<T> = {
  ok: true;
  statusCode: number;
  data: T;
  externalRequestId: string | null;
};

export type VsdcNormalizedError = {
  ok: false;
  statusCode: number;
  error: {
    message: string;
    code: string;
    details?: unknown;
  };
  externalRequestId: string | null;
};

export type VsdcNormalizedResponse<T> = VsdcNormalizedSuccess<T> | VsdcNormalizedError;
