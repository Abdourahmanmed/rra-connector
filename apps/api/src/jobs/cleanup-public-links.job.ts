import prisma from "../config/prisma";
import { logger } from "../config/logger";

export type CleanupPublicLinksJobResult = {
  revokedExpiredLinks: number;
};

export async function runCleanupPublicLinksJob(): Promise<CleanupPublicLinksJobResult> {
  const now = new Date();

  const revokedResult = await prisma.publicLink.updateMany({
    where: {
      isRevoked: false,
      expiresAt: {
        not: null,
        lt: now
      }
    },
    data: {
      isRevoked: true
    }
  });

  const result: CleanupPublicLinksJobResult = {
    revokedExpiredLinks: revokedResult.count
  };

  logger.info("Cleanup public links job completed", {
    ...result,
    executedAt: now.toISOString()
  });

  return result;
}
