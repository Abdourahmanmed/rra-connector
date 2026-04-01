import { FiscalStatus, SubmissionStatus, SubmissionType, type SageInvoice, type SageInvoiceItem } from "@prisma/client";
import { createHash } from "node:crypto";
import prisma from "../../config/prisma";
import { logger } from "../../config/logger";
import { FiscalMapper } from "./fiscal.mapper";
import { VsdcService } from "../../services/vsdc/vsdc.service";

const mapper = new FiscalMapper();
const vsdcService = new VsdcService();
const MAX_SEND_ATTEMPTS = 1;

class FiscalizationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string
  ) {
    super(message);
  }
}

type FiscalizeResult = {
  submissionId: string;
  invoiceId: string;
  status: SubmissionStatus;
  fiscalStatus: FiscalStatus;
  responsePayload: unknown;
};

export class FiscalService {
  async fiscalizeInvoice(invoiceId: string): Promise<FiscalizeResult> {
    const invoice = await prisma.sageInvoice.findUnique({
      where: { id: invoiceId },
      include: { items: { orderBy: { lineNo: "asc" } } }
    });

    if (!invoice) {
      throw new FiscalizationError("Invoice not found", 404, "INVOICE_NOT_FOUND");
    }

    if (invoice.items.length === 0) {
      throw new FiscalizationError("Invoice has no items and cannot be fiscalized", 422, "NO_INVOICE_ITEMS");
    }

    const requestPayload = mapper.toVsdcSalePayload(invoice as SageInvoice, invoice.items as SageInvoiceItem[]);
    const previousAttempts = await prisma.fiscalSubmission.count({
      where: { sageInvoiceId: invoice.id }
    });
    const idempotencyKey = this.buildIdempotencyKey(invoice.id, invoice.updatedAt, previousAttempts);

    await this.createSyncLog(invoice.id, "INFO", "Fiscalization started", {
      invoiceId: invoice.id,
      idempotencyKey
    });

    await prisma.sageInvoice.update({
      where: { id: invoice.id },
      data: { fiscalStatus: FiscalStatus.QUEUED, lastAttemptAt: new Date() }
    });

    const submission = await prisma.fiscalSubmission.create({
      data: {
        sageInvoiceId: invoice.id,
        submissionType: SubmissionType.SALE,
        status: SubmissionStatus.PENDING,
        idempotencyKey,
        requestPayload
      }
    });

    const sendResult = await this.sendToVsdcWithRetry(submission.id, requestPayload, idempotencyKey);

    if (sendResult.status === SubmissionStatus.SUCCESS) {
      if (!sendResult.parsedResult) {
        throw new FiscalizationError("VSDC response payload is missing required fields", 502, "INVALID_VSDC_RESPONSE");
      }

      const parsedResult = sendResult.parsedResult;

      await prisma.$transaction([
        prisma.fiscalResult.upsert({
          where: { sageInvoiceId: invoice.id },
          update: {
            rcptNo: parsedResult.rcptNo,
            intrlData: parsedResult.intrlData,
            rcptSign: parsedResult.rcptSign,
            verificationUrl: parsedResult.verificationUrl,
            sdcId: parsedResult.sdcId,
            mrcNo: parsedResult.mrcNo,
            qrCodeData: parsedResult.qrCodeData,
            fiscalDay: parsedResult.fiscalDay,
            taxAmount: parsedResult.taxAmount,
            totalAmount: parsedResult.totalAmount,
            resultPayload: sendResult.body,
            receivedAt: new Date()
          },
          create: {
            sageInvoiceId: invoice.id,
            rcptNo: parsedResult.rcptNo,
            intrlData: parsedResult.intrlData,
            rcptSign: parsedResult.rcptSign,
            verificationUrl: parsedResult.verificationUrl,
            sdcId: parsedResult.sdcId,
            mrcNo: parsedResult.mrcNo,
            qrCodeData: parsedResult.qrCodeData,
            fiscalDay: parsedResult.fiscalDay,
            taxAmount: parsedResult.taxAmount,
            totalAmount: parsedResult.totalAmount,
            resultPayload: sendResult.body,
            receivedAt: new Date()
          }
        }),
        prisma.sageInvoice.update({
          where: { id: invoice.id },
          data: { fiscalStatus: FiscalStatus.ACCEPTED }
        }),
        prisma.syncLog.create({
          data: {
            sageInvoiceId: invoice.id,
            source: "FISCAL_API",
            level: "INFO",
            message: "Invoice fiscalized successfully",
            context: {
              submissionId: submission.id,
              statusCode: sendResult.statusCode
            }
          }
        })
      ]);

      return {
        submissionId: submission.id,
        invoiceId: invoice.id,
        status: SubmissionStatus.SUCCESS,
        fiscalStatus: FiscalStatus.ACCEPTED,
        responsePayload: sendResult.body
      };
    }

    await prisma.$transaction([
      prisma.sageInvoice.update({
        where: { id: invoice.id },
        data: { fiscalStatus: sendResult.timedOut ? FiscalStatus.ERROR : FiscalStatus.REJECTED }
      }),
      prisma.syncLog.create({
        data: {
          sageInvoiceId: invoice.id,
          source: "FISCAL_API",
          level: sendResult.timedOut ? "ERROR" : "WARN",
          message: sendResult.timedOut ? "Fiscalization timed out" : "Fiscalization rejected by VSDC",
          context: {
            submissionId: submission.id,
            statusCode: sendResult.statusCode,
            response: sendResult.body
          }
        }
      })
    ]);

    throw new FiscalizationError(
      sendResult.timedOut ? "VSDC timed out while fiscalizing invoice" : "VSDC rejected fiscalization request",
      sendResult.timedOut ? 504 : 502,
      sendResult.timedOut ? "VSDC_TIMEOUT" : "VSDC_REJECTED"
    );
  }

  private async sendToVsdcWithRetry(submissionId: string, payload: unknown, idempotencyKey: string) {
    let attempt = 0;

    while (attempt < MAX_SEND_ATTEMPTS) {
      try {
        attempt += 1;

        const response = await vsdcService.submitSale(payload as never, idempotencyKey);
        const success = response.statusCode >= 200 && response.statusCode < 300;

        if (success) {
          const parsedResult = this.extractResult(response.body);
          await prisma.fiscalSubmission.update({
            where: { id: submissionId },
            data: {
              status: SubmissionStatus.SUCCESS,
              responsePayload: response.body,
              externalRequestId: response.externalRequestId,
              submittedAt: new Date(),
              completedAt: new Date(),
              retryCount: attempt - 1,
              errorMessage: null
            }
          });

          return {
            status: SubmissionStatus.SUCCESS,
            statusCode: response.statusCode,
            body: response.body,
            parsedResult,
            timedOut: false
          };
        }

        await prisma.fiscalSubmission.update({
          where: { id: submissionId },
          data: {
            status: SubmissionStatus.FAILED,
            responsePayload: response.body,
            externalRequestId: response.externalRequestId,
            submittedAt: new Date(),
            completedAt: new Date(),
            retryCount: attempt - 1,
            errorMessage: `VSDC responded with ${response.statusCode}`
          }
        });

        return {
          status: SubmissionStatus.FAILED,
          statusCode: response.statusCode,
          body: response.body,
          parsedResult: null,
          timedOut: false
        };
      } catch (error) {
        const timedOut = error instanceof Error && error.name === "AbortError";

        await prisma.fiscalSubmission.update({
          where: { id: submissionId },
          data: {
            status: timedOut ? SubmissionStatus.TIMEOUT : SubmissionStatus.FAILED,
            submittedAt: new Date(),
            completedAt: new Date(),
            retryCount: attempt - 1,
            errorMessage: error instanceof Error ? error.message : "Unknown fiscal submission error"
          }
        });

        logger.error("Fiscal submission attempt failed", {
          submissionId,
          attempt,
          error: error instanceof Error ? error.message : "Unknown error"
        });

        if (attempt >= MAX_SEND_ATTEMPTS) {
          return {
            status: timedOut ? SubmissionStatus.TIMEOUT : SubmissionStatus.FAILED,
            statusCode: 0,
            body: { error: error instanceof Error ? error.message : "Unknown error" },
            parsedResult: null,
            timedOut
          };
        }
      }
    }

    return {
      status: SubmissionStatus.FAILED,
      statusCode: 0,
      body: { error: "No VSDC attempts were performed" },
      parsedResult: null,
      timedOut: false
    };
  }

  private extractResult(payload: unknown) {
    const body = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};

    const rcptNo = this.requiredString(body.rcptNo, "VSDC response is missing rcptNo");
    const rcptSign = this.requiredString(body.rcptSign, "VSDC response is missing rcptSign");

    return {
      rcptNo,
      rcptSign,
      intrlData: this.optionalString(body.intrlData),
      verificationUrl: this.optionalString(body.verificationUrl),
      sdcId: this.optionalString(body.sdcId),
      mrcNo: this.optionalString(body.mrcNo),
      qrCodeData: this.optionalString(body.qrCodeData),
      fiscalDay: this.optionalString(body.fiscalDay),
      taxAmount: this.optionalNumber(body.taxAmount),
      totalAmount: this.optionalNumber(body.totalAmount)
    };
  }

  private requiredString(value: unknown, message: string): string {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new FiscalizationError(message, 502, "INVALID_VSDC_RESPONSE");
    }

    return value;
  }

  private optionalString(value: unknown): string | null {
    return typeof value === "string" && value.trim().length > 0 ? value : null;
  }

  private optionalNumber(value: unknown): number | null {
    if (typeof value === "number") {
      return value;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  private buildIdempotencyKey(invoiceId: string, invoiceUpdatedAt: Date, previousAttempts: number): string {
    const digest = createHash("sha256")
      .update(`${invoiceId}:${invoiceUpdatedAt.toISOString()}:${previousAttempts + 1}`)
      .digest("hex");

    return `sale-${digest.slice(0, 40)}`;
  }

  private async createSyncLog(
    invoiceId: string,
    level: "DEBUG" | "INFO" | "WARN" | "ERROR",
    message: string,
    context: Record<string, unknown>
  ): Promise<void> {
    await prisma.syncLog.create({
      data: {
        sageInvoiceId: invoiceId,
        source: "FISCAL_API",
        level,
        message,
        context
      }
    });
  }
}
