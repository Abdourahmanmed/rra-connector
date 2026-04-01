import { createHash, randomBytes } from "node:crypto";
import { DocumentType, GenerationStatus, QrStatus } from "@prisma/client";
import prisma from "../../config/prisma";

const SETUP_KEY = "connector_setup";

class QrGenerationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string
  ) {
    super(message);
  }
}

type StoredSettingsValue = {
  publicUrl?: string;
};

type GeneratePublicLinkResult = {
  invoiceId: string;
  token: string;
  targetUrl: string;
  qrContent: string;
  qrMimeType: string;
  qrStatus: QrStatus;
};

export class QrService {
  async generatePublicLink(invoiceId: string): Promise<GeneratePublicLinkResult> {
    const invoice = await prisma.sageInvoice.findUnique({
      where: { id: invoiceId },
      select: { id: true }
    });

    if (!invoice) {
      throw new QrGenerationError("Invoice not found", 404, "INVOICE_NOT_FOUND");
    }

    const publicBaseUrl = await this.getPublicBaseUrl();

    await prisma.sageInvoice.update({
      where: { id: invoice.id },
      data: { qrStatus: QrStatus.PENDING }
    });

    try {
      const existingLink = await prisma.publicLink.findFirst({
        where: {
          sageInvoiceId: invoice.id,
          isRevoked: false
        },
        orderBy: { createdAt: "desc" }
      });

      const token = existingLink?.token ?? this.generateSecureToken();
      const targetUrl = this.buildPublicInvoiceUrl(publicBaseUrl, token);
      const qrContent = targetUrl;
      const qrMimeType = "text/plain";
      const qrSha256 = createHash("sha256").update(qrContent).digest("hex");
      const generatedAt = new Date();
      const qrDocumentFileName = `invoice-${invoice.id}-qr.txt`;

      const result = await prisma.$transaction(async (tx) => {
        const publicLink = existingLink
          ? await tx.publicLink.update({
              where: { id: existingLink.id },
              data: {
                targetUrl,
                isRevoked: false
              }
            })
          : await tx.publicLink.create({
              data: {
                sageInvoiceId: invoice.id,
                token,
                targetUrl,
                label: "Public invoice link",
                isRevoked: false
              }
            });

        const existingQrDocument = await tx.generatedDocument.findFirst({
          where: {
            sageInvoiceId: invoice.id,
            type: DocumentType.QR_IMAGE
          },
          orderBy: { createdAt: "desc" }
        });

        if (existingQrDocument) {
          await tx.generatedDocument.update({
            where: { id: existingQrDocument.id },
            data: {
              status: GenerationStatus.GENERATED,
              fileName: qrDocumentFileName,
              mimeType: qrMimeType,
              storagePath: targetUrl,
              sha256: qrSha256,
              fileSizeBytes: BigInt(Buffer.byteLength(qrContent, "utf8")),
              generatedAt
            }
          });
        } else {
          await tx.generatedDocument.create({
            data: {
              sageInvoiceId: invoice.id,
              type: DocumentType.QR_IMAGE,
              status: GenerationStatus.GENERATED,
              fileName: qrDocumentFileName,
              mimeType: qrMimeType,
              storagePath: targetUrl,
              sha256: qrSha256,
              fileSizeBytes: BigInt(Buffer.byteLength(qrContent, "utf8")),
              generatedAt
            }
          });
        }

        await tx.sageInvoice.update({
          where: { id: invoice.id },
          data: {
            qrStatus: QrStatus.GENERATED
          }
        });

        await tx.syncLog.create({
          data: {
            sageInvoiceId: invoice.id,
            source: "QR_ENGINE",
            level: "INFO",
            message: "Public link generated for invoice",
            context: {
              publicLinkId: publicLink.id,
              token: publicLink.token,
              targetUrl,
              qrMimeType
            }
          }
        });

        return {
          token: publicLink.token,
          targetUrl
        };
      });

      return {
        invoiceId: invoice.id,
        token: result.token,
        targetUrl: result.targetUrl,
        qrContent,
        qrMimeType,
        qrStatus: QrStatus.GENERATED
      };
    } catch (error) {
      await prisma.sageInvoice.update({
        where: { id: invoice.id },
        data: { qrStatus: QrStatus.FAILED }
      });

      await prisma.syncLog.create({
        data: {
          sageInvoiceId: invoice.id,
          source: "QR_ENGINE",
          level: "ERROR",
          message: "Public link generation failed for invoice",
          context: {
            error: error instanceof Error ? error.message : "Unknown error"
          }
        }
      });

      if (error instanceof QrGenerationError) {
        throw error;
      }

      throw new QrGenerationError("Unable to generate public invoice link", 500, "QR_GENERATION_FAILED");
    }
  }

  private async getPublicBaseUrl(): Promise<string> {
    const setting = await prisma.setting.findFirst({
      where: { key: SETUP_KEY, isActive: true },
      select: { value: true }
    });

    const settingsValue = this.parseValue(setting?.value ?? null);
    const baseUrl = settingsValue.publicUrl?.trim();

    if (!baseUrl) {
      throw new QrGenerationError("Public base URL is not configured", 409, "PUBLIC_URL_NOT_CONFIGURED");
    }

    return baseUrl;
  }

  private buildPublicInvoiceUrl(publicBaseUrl: string, token: string): string {
    const normalizedBaseUrl = publicBaseUrl.endsWith("/") ? publicBaseUrl.slice(0, -1) : publicBaseUrl;
    return `${normalizedBaseUrl}/public/invoice/${token}`;
  }

  private generateSecureToken(): string {
    return randomBytes(32).toString("hex");
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

export { QrGenerationError };
