import net from "node:net";
import { db } from "../../config/db";
import { encryptSecret } from "../../services/secret-crypto.service";
import type {
  CompleteSetupInput,
  ServiceResult,
  SetupStatusResponse,
  TestSqlInput,
  TestVsdcInput
} from "./setup.types";

const SETUP_KEY = "connector_setup";

export class SetupService {
  async getStatus(): Promise<SetupStatusResponse> {
    const setting = await db.setting.findFirst({
      where: { key: SETUP_KEY, isActive: true },
      select: { createdAt: true }
    });

    return {
      initialized: Boolean(setting),
      configuredAt: setting?.createdAt.toISOString() ?? null
    };
  }

  async testSqlConnection(input: TestSqlInput): Promise<ServiceResult> {
    try {
      await this.testTcpConnection({
        host: input.host,
        port: input.port,
        timeoutMs: input.timeoutMs
      });

      return {
        success: true,
        message: "SQL Server is reachable."
      };
    } catch (error) {
      return {
        success: false,
        message: "Unable to connect to SQL Server.",
        details: error instanceof Error ? error.message : "Connection test failed"
      };
    }
  }

  async testVsdcConnectivity(input: TestVsdcInput): Promise<ServiceResult<{ statusCode: number }>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs);

    try {
      const response = await fetch(input.baseUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "x-device-id": input.deviceId,
          "x-client-id": input.clientId,
          "x-client-secret": input.clientSecret
        }
      });

      return {
        success: true,
        message: "VSDC endpoint is reachable.",
        data: { statusCode: response.status }
      };
    } catch (error) {
      return {
        success: false,
        message: "Unable to reach VSDC endpoint.",
        details: error instanceof Error ? error.message : "Connectivity test failed"
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  async completeSetup(input: CompleteSetupInput): Promise<ServiceResult> {
    const sqlPasswordEncrypted = encryptSecret(input.sql.password);
    const vsdcSecretEncrypted = encryptSecret(input.vsdc.clientSecret);

    await db.setting.upsert({
      where: { key: SETUP_KEY },
      update: {
        description: "Connector setup configuration",
        sqlServerHost: input.sql.host,
        sqlServerInstance: input.sql.instance,
        sqlServerPort: input.sql.port,
        sqlDatabaseName: input.sql.database,
        sqlUsername: input.sql.username,
        sqlPasswordEncrypted,
        sqlAuthType: input.sql.authType,
        value: JSON.stringify({
          vsdc: {
            baseUrl: input.vsdc.baseUrl,
            deviceId: input.vsdc.deviceId,
            clientId: input.vsdc.clientId,
            clientSecretEncrypted: vsdcSecretEncrypted
          }
        }),
        isActive: true
      },
      create: {
        key: SETUP_KEY,
        description: "Connector setup configuration",
        sqlServerHost: input.sql.host,
        sqlServerInstance: input.sql.instance,
        sqlServerPort: input.sql.port,
        sqlDatabaseName: input.sql.database,
        sqlUsername: input.sql.username,
        sqlPasswordEncrypted,
        sqlAuthType: input.sql.authType,
        value: JSON.stringify({
          vsdc: {
            baseUrl: input.vsdc.baseUrl,
            deviceId: input.vsdc.deviceId,
            clientId: input.vsdc.clientId,
            clientSecretEncrypted: vsdcSecretEncrypted
          }
        }),
        isActive: true
      }
    });

    return {
      success: true,
      message: "Setup configuration saved successfully."
    };
  }

  private async testTcpConnection(params: {
    host: string;
    port: number;
    timeoutMs: number;
  }): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();

      const cleanup = () => {
        socket.removeAllListeners();
        socket.destroy();
      };

      socket.setTimeout(params.timeoutMs);

      socket.once("connect", () => {
        cleanup();
        resolve();
      });

      socket.once("timeout", () => {
        cleanup();
        reject(new Error(`Connection timed out after ${params.timeoutMs}ms`));
      });

      socket.once("error", (error) => {
        cleanup();
        reject(error);
      });

      socket.connect(params.port, params.host);
    });
  }
}
