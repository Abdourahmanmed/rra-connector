import { FiscalStatus } from "@prisma/client";
import prisma from "../config/prisma";
import { logger } from "../config/logger";
import { FiscalService } from "../modules/fiscal/fiscal.service";

const fiscalService = new FiscalService();
const DEFAULT_BATCH_SIZE = 25;

export type RetryFailedSubmissionsJobOptions = {
  batchSize?: number;
};

export type RetryFailedSubmissionsJobResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  invoiceIds: string[];
};

export async function runRetryFailedSubmissionsJob(
  options: RetryFailedSubmissionsJobOptions = {}
): Promise<RetryFailedSubmissionsJobResult> {
  const batchSize = Math.max(1, options.batchSize ?? DEFAULT_BATCH_SIZE);

  const invoices = await prisma.sageInvoice.findMany({
    where: {
      fiscalStatus: {
        in: [FiscalStatus.REJECTED, FiscalStatus.ERROR]
      }
    },
    select: {
      id: true
    },
    orderBy: {
      updatedAt: "asc"
    },
    take: batchSize
  });

  logger.info("Retry failed submissions job started", {
    batchSize,
    found: invoices.length
  });

  let succeeded = 0;
  let failed = 0;

  for (const invoice of invoices) {
    try {
      await fiscalService.fiscalizeInvoice(invoice.id);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      logger.error("Retry failed submissions job could not fiscalize invoice", {
        invoiceId: invoice.id,
        error: error instanceof Error ? error.message : "Unknown retry error"
      });
    }
  }

  const result: RetryFailedSubmissionsJobResult = {
    attempted: invoices.length,
    succeeded,
    failed,
    invoiceIds: invoices.map((invoice) => invoice.id)
  };

  logger.info("Retry failed submissions job completed", result);

  return result;
}
