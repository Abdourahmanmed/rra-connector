import prisma from "../../config/prisma";
import { logger } from "../../config/logger";
import { sqlServerService } from "../../services/sqlserver";
import { mapSageInvoiceHeader, mapSageInvoiceLine } from "./sage.mapper";
import type { SageHeaderRow, SageLineRow, SyncInvoicesResult, TestReadResult } from "./sage.types";

const SALES_DOC_TYPE = 7;
const TEST_READ_LIMIT = 5;

export class SageService {
  async testRead(): Promise<TestReadResult> {
    const headers = await sqlServerService.runQuery<SageHeaderRow>(
      `
      SELECT TOP (${TEST_READ_LIMIT}) h.*, c.CT_Num, c.CT_Intitule, c.CT_Identifiant, c.CT_Telephone, c.CT_EMail, c.CT_Adresse
      FROM F_DOCENTETE h
      LEFT JOIN F_COMPTET c ON c.CT_Num = h.DO_Tiers
      WHERE h.DO_Type = @docType
      ORDER BY DO_Date DESC, DO_Piece DESC
      `,
      { docType: SALES_DOC_TYPE }
    );

    return {
      count: headers.length,
      sample: headers.map((row) => {
        const mapped = mapSageInvoiceHeader(row);

        return {
          sagePiece: mapped.sagePiece,
          sageDocType: mapped.sageDocType,
          invoiceDate: mapped.invoiceDate.toISOString(),
          customerCode: mapped.customerCode
        };
      })
    };
  }

  async syncInvoices(): Promise<SyncInvoicesResult> {
    const checkpoint = await this.getCheckpoint();

    logger.info("Sage invoice sync started", {
      checkpoint: checkpoint?.toISOString() ?? null,
      docType: SALES_DOC_TYPE
    });

    const headers = await sqlServerService.runQuery<SageHeaderRow>(
      `
      SELECT h.*, c.CT_Num, c.CT_Intitule, c.CT_Identifiant, c.CT_Telephone, c.CT_EMail, c.CT_Adresse
      FROM F_DOCENTETE h
      LEFT JOIN F_COMPTET c ON c.CT_Num = h.DO_Tiers
      WHERE h.DO_Type = @docType
        AND (@checkpoint IS NULL OR h.DO_Date >= @checkpoint)
      ORDER BY h.DO_Date ASC, h.DO_Piece ASC
      `,
      {
        docType: SALES_DOC_TYPE,
        checkpoint
      }
    );

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const header of headers) {
      const mappedInvoice = mapSageInvoiceHeader(header);

      if (!mappedInvoice.sagePiece) {
        skipped += 1;
        logger.warn("Skipping Sage invoice without DO_Piece", { header });
        continue;
      }

      const lines = await sqlServerService.runQuery<SageLineRow>(
        `
        SELECT l.*, a.AR_Ref, a.AR_Design
        FROM F_DOCLIGNE l
        LEFT JOIN F_ARTICLE a ON a.AR_Ref = l.AR_Ref
        WHERE l.DO_Type = @docType
          AND l.DO_Piece = @piece
        ORDER BY l.DL_Ligne ASC
        `,
        {
          docType: SALES_DOC_TYPE,
          piece: mappedInvoice.sagePiece
        }
      );

      const mappedItems = lines.map((line, index) => mapSageInvoiceLine(line, index));

      if (mappedItems.length === 0) {
        skipped += 1;
        logger.warn("Skipping Sage invoice without lines", {
          sagePiece: mappedInvoice.sagePiece,
          sageDocType: mappedInvoice.sageDocType
        });
        continue;
      }

      const existing = await prisma.sageInvoice.findUnique({
        where: {
          sagePiece_sageDocType: {
            sagePiece: mappedInvoice.sagePiece,
            sageDocType: mappedInvoice.sageDocType
          }
        },
        select: { id: true }
      });

      await prisma.$transaction(async (tx: typeof prisma) => {
        const invoice = await tx.sageInvoice.upsert({
          where: {
            sagePiece_sageDocType: {
              sagePiece: mappedInvoice.sagePiece,
              sageDocType: mappedInvoice.sageDocType
            }
          },
          create: {
            ...mappedInvoice,
            importedAt: new Date(),
            lastAttemptAt: new Date()
          },
          update: {
            ...mappedInvoice,
            importedAt: new Date(),
            lastAttemptAt: new Date()
          },
          select: { id: true }
        });

        await tx.sageInvoiceItem.deleteMany({
          where: { sageInvoiceId: invoice.id }
        });

        await tx.sageInvoiceItem.createMany({
          data: mappedItems.map((item) => ({
            ...item,
            sageInvoiceId: invoice.id
          }))
        });
      });

      if (existing) {
        updated += 1;
      } else {
        inserted += 1;
      }
    }

    logger.info("Sage invoice sync completed", {
      headersFetched: headers.length,
      inserted,
      updated,
      skipped
    });

    return {
      synced: inserted + updated,
      inserted,
      updated,
      skipped,
      checkpoint: checkpoint?.toISOString() ?? null
    };
  }

  private async getCheckpoint(): Promise<Date | null> {
    const latestImported = await prisma.sageInvoice.findFirst({
      where: {
        sourceUpdatedAt: {
          not: null
        }
      },
      orderBy: { sourceUpdatedAt: "desc" },
      select: { sourceUpdatedAt: true }
    });

    return latestImported?.sourceUpdatedAt ?? null;
  }
}
