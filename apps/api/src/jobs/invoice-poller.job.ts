import { logger } from "../config/logger";
import { SageService } from "../modules/sage/sage.service";

const sageService = new SageService();

export type InvoicePollerJobResult = {
  synced: number;
  inserted: number;
  updated: number;
  skipped: number;
  checkpoint: string | null;
};

export async function runInvoicePollerJob(): Promise<InvoicePollerJobResult> {
  logger.info("Invoice poller job started");

  const result = await sageService.syncInvoices();

  logger.info("Invoice poller job completed", result);

  return result;
}
