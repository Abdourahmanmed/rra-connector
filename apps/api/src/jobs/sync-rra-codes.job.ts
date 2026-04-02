import { SyncType } from "@prisma/client";
import prisma from "../config/prisma";
import { logger } from "../config/logger";

export type SyncRraCodesJobResult = {
  status: "not_implemented";
  syncedTypes: SyncType[];
  message: string;
};

export async function runSyncRraCodesJob(): Promise<SyncRraCodesJobResult> {
  const message = "RRA code sync scaffolding is in place; provider integration will be added in a future task.";

  await prisma.syncLog.create({
    data: {
      source: "SYNC",
      level: "INFO",
      syncType: SyncType.ITEM_CODES,
      message,
      context: {
        scope: [SyncType.ITEM_CODES, SyncType.TAX_CODES]
      }
    }
  });

  const result: SyncRraCodesJobResult = {
    status: "not_implemented",
    syncedTypes: [SyncType.ITEM_CODES, SyncType.TAX_CODES],
    message
  };

  logger.info("RRA code sync job scaffold executed", result);

  return result;
}
