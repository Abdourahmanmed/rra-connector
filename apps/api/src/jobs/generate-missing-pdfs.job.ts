import { logger } from "../config/logger";
import { DocumentsService } from "../modules/documents/documents.service";

const documentsService = new DocumentsService();

export type GenerateMissingPdfsJobResult = {
  generated: number;
  skipped: number;
  failed: number;
};

export async function runGenerateMissingPdfsJob(): Promise<GenerateMissingPdfsJobResult> {
  logger.info("Generate-missing-pdfs job started");

  const result = await documentsService.generateMissingInvoicePdfs();

  logger.info("Generate-missing-pdfs job completed", result);

  return result;
}
