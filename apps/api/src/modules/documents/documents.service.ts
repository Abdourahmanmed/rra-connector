import { createHash } from "node:crypto";
import { access, constants as fsConstants, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DocumentType, GenerationStatus, InvoiceImportStatus, PdfStatus, type Prisma } from "@prisma/client";
import { Env } from "../../config/env";
import { logger } from "../../config/logger";
import prisma from "../../config/prisma";
import { buildInvoiceHtml } from "./invoice-template";

class DocumentGenerationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string
  ) {
    super(message);
  }
}

type GeneratePdfResult = {
  documentId: string;
  invoiceId: string;
  fileName: string;
  storagePath: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256: string;
  generatedAt: string;
  wasExisting: boolean;
};

type StoredSettingsValue = {
  company?: {
    name?: string;
    tin?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
    logoPath?: string;
    bankDetails?: string;
  };
  seller?: {
    name?: string;
    tin?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    logoUrl?: string;
    logoPath?: string;
    bankDetails?: string;
  };
};

const SETUP_KEY = "connector_setup";

export class DocumentsService {
  async generateMissingInvoicePdfs(limit = 25): Promise<{ generated: number; skipped: number; failed: number }> {
    const invoices = await prisma.sageInvoice.findMany({
      where: {
        importStatus: InvoiceImportStatus.IMPORTED,
        pdfStatus: PdfStatus.NOT_REQUESTED,
        documents: {
          none: {
            type: DocumentType.INVOICE_PDF
          }
        }
      },
      select: { id: true },
      orderBy: { importedAt: "asc" },
      take: limit
    });

    let generated = 0;
    let skipped = 0;
    let failed = 0;

    for (const invoice of invoices) {
      try {
        const result = await this.generateInvoicePdf(invoice.id);
        if (result.wasExisting) {
          skipped += 1;
        } else {
          generated += 1;
        }
      } catch (error) {
        failed += 1;
        logger.error("Invoice PDF generation failed in scheduled run", {
          invoiceId: invoice.id,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return { generated, skipped, failed };
  }

  async generateInvoicePdf(invoiceId: string, options?: { forceRegenerate?: boolean }): Promise<GeneratePdfResult> {
    const existingPdf = await prisma.generatedDocument.findFirst({
      where: {
        sageInvoiceId: invoiceId,
        type: DocumentType.INVOICE_PDF,
        status: GenerationStatus.GENERATED
      },
      orderBy: { generatedAt: "desc" }
    });

    if (existingPdf && !options?.forceRegenerate) {
      await prisma.sageInvoice.update({
        where: { id: invoiceId },
        data: { pdfStatus: PdfStatus.GENERATED }
      });

      await prisma.syncLog.create({
        data: {
          sageInvoiceId: invoiceId,
          source: "DOCUMENT_ENGINE",
          level: "INFO",
          message: "Invoice PDF generation skipped because PDF already exists",
          context: {
            documentId: existingPdf.id,
            fileName: existingPdf.fileName
          }
        }
      });

      logger.info("Invoice PDF generation skipped because PDF already exists", {
        invoiceId,
        documentId: existingPdf.id
      });

      return {
        documentId: existingPdf.id,
        invoiceId,
        fileName: existingPdf.fileName,
        storagePath: existingPdf.storagePath,
        mimeType: existingPdf.mimeType,
        fileSizeBytes: existingPdf.fileSizeBytes ? Number(existingPdf.fileSizeBytes) : 0,
        sha256: existingPdf.sha256 ?? "",
        generatedAt: (existingPdf.generatedAt ?? existingPdf.createdAt).toISOString(),
        wasExisting: true
      };
    }

    const [invoice, setting] = await Promise.all([
      prisma.sageInvoice.findUnique({
        where: { id: invoiceId },
        include: {
          items: { orderBy: { lineNo: "asc" } },
          fiscalResult: true
        }
      }),
      prisma.setting.findFirst({
        where: { key: SETUP_KEY, isActive: true },
        select: { value: true }
      })
    ]);

    if (!invoice) {
      throw new DocumentGenerationError("Invoice not found", 404, "INVOICE_NOT_FOUND");
    }

    await prisma.sageInvoice.update({
      where: { id: invoice.id },
      data: { pdfStatus: PdfStatus.PENDING }
    });

    try {
      const settingsValue = this.parseSettingsValue(setting?.value ?? null);
      const seller = settingsValue.seller ?? settingsValue.company ?? {};
      const logoUrl = seller.logoUrl ?? seller.logoPath ?? settingsValue.company?.logoUrl ?? settingsValue.company?.logoPath ?? null;

      const invoiceDate = invoice.invoiceDate;
      const fiscalDate = invoice.fiscalResult?.receivedAt ?? null;
      const fiscalItems = invoice.items.length;

      const html = buildInvoiceHtml({
        invoiceId: invoice.id,
        invoiceNumber: invoice.sageDocumentNo ?? invoice.sagePiece,
        invoiceReference: invoice.sagePiece,
        invoiceDate: invoiceDate.toISOString().slice(0, 10),
        invoiceTime: invoiceDate.toISOString().slice(11, 19),
        currencyCode: invoice.currencyCode,
        customer: {
          name: invoice.customerName ?? "Walk-in customer",
          tin: invoice.customerTin,
          phone: null,
          email: null,
          address: invoice.customerCode
        },
        seller: {
          companyName: seller.name ?? Env.COMPANY_NAME,
          tin: seller.tin ?? Env.COMPANY_TIN,
          phone: seller.phone ?? null,
          email: seller.email ?? null,
          address: seller.address ?? Env.COMPANY_ADDRESS,
          website: seller.website ?? null
        },
        logoUrl,
        paymentMode: null,
        doneBy: "System",
        bankDetails: this.toLines(seller.bankDetails ?? settingsValue.company?.bankDetails),
        totals: {
          base: this.toNumber(invoice.subtotalAmount),
          taxRate: 0,
          vat: this.toNumber(invoice.taxAmount),
          totalExclusive: this.toNumber(invoice.subtotalAmount),
          totalInclusive: this.toNumber(invoice.totalAmount),
          netAmount: this.toNumber(invoice.totalAmount)
        },
        fiscal: {
          sdcId: invoice.fiscalResult?.sdcId ?? null,
          receiptNumber: invoice.fiscalResult?.rcptNo ?? null,
          receiptSignature: invoice.fiscalResult?.rcptSign ?? null,
          internalData: invoice.fiscalResult?.intrlData ?? null,
          date: fiscalDate ? fiscalDate.toISOString().slice(0, 10) : null,
          time: fiscalDate ? fiscalDate.toISOString().slice(11, 19) : null,
          cisDate: invoice.fiscalResult?.fiscalDay ?? null,
          totalTax: invoice.fiscalResult?.taxAmount ? this.toNumber(invoice.fiscalResult.taxAmount) : null,
          totalAmount: invoice.fiscalResult?.totalAmount ? this.toNumber(invoice.fiscalResult.totalAmount) : null,
          itemsNumber: invoice.fiscalResult ? fiscalItems : null,
          mrc: invoice.fiscalResult?.mrcNo ?? null
        },
        items: invoice.items.map((item) => ({
          lineNo: item.lineNo,
          itemReference: item.itemCode ?? `ITEM-${item.lineNo}`,
          description: item.itemName,
          batchNumber: null,
          expiryDate: null,
          quantity: this.toNumber(item.quantity),
          unitPrice: this.toNumber(item.unitPrice),
          taxRate: this.toNumber(item.taxRate),
          taxAmount: this.toNumber(item.taxAmount),
          totalTaxIncl: this.toNumber(item.lineTotal)
        }))
      });

      const puppeteer = require("puppeteer") as { launch: (options: Record<string, unknown>) => Promise<{ newPage: () => Promise<{ setContent: (html: string, options: { waitUntil: string }) => Promise<void>; pdf: (options: Record<string, unknown>) => Promise<Uint8Array>; }>; close: () => Promise<void>; }>; };

      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
      });

      let pdfBuffer: Buffer;
      try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        pdfBuffer = Buffer.from(
          await page.pdf({
            format: "A4",
            printBackground: true,
            margin: { top: "4mm", right: "4mm", bottom: "4mm", left: "4mm" }
          })
        );
      } finally {
        await browser.close();
      }

      const generatedAt = new Date();
      const storageDir = resolve(Env.DOCUMENTS_STORAGE_PATH);
      await mkdir(storageDir, { recursive: true });

      const safeInvoiceNo = (invoice.sageDocumentNo ?? invoice.sagePiece ?? invoice.id).replaceAll(/[^a-zA-Z0-9-_]/g, "-");
      const fileName = `invoice-${safeInvoiceNo}-${generatedAt.getTime()}.pdf`;
      const fullPath = join(storageDir, fileName);

      await writeFile(fullPath, pdfBuffer);

      const sha256 = createHash("sha256").update(pdfBuffer).digest("hex");

      const document = await prisma.$transaction(async (tx) => {
        const created = await tx.generatedDocument.create({
          data: {
            sageInvoiceId: invoice.id,
            type: DocumentType.INVOICE_PDF,
            status: GenerationStatus.GENERATED,
            fileName,
            mimeType: "application/pdf",
            storagePath: fullPath,
            sha256,
            fileSizeBytes: BigInt(pdfBuffer.length),
            generatedAt
          }
        });

        await tx.sageInvoice.update({
          where: { id: invoice.id },
          data: { pdfStatus: PdfStatus.GENERATED }
        });

        await tx.syncLog.create({
          data: {
            sageInvoiceId: invoice.id,
            source: "DOCUMENT_ENGINE",
            level: "INFO",
            message: options?.forceRegenerate ? "Invoice PDF regenerated" : "Invoice PDF generated",
            context: {
              documentId: created.id,
              storagePath: fullPath,
              fileSizeBytes: pdfBuffer.length,
              forceRegenerate: Boolean(options?.forceRegenerate)
            }
          }
        });

        return created;
      });

      return {
        documentId: document.id,
        invoiceId: invoice.id,
        fileName,
        storagePath: fullPath,
        mimeType: "application/pdf",
        fileSizeBytes: pdfBuffer.length,
        sha256,
        generatedAt: generatedAt.toISOString(),
        wasExisting: false
      };
    } catch (error) {
      await prisma.sageInvoice.update({
        where: { id: invoice.id },
        data: { pdfStatus: PdfStatus.FAILED }
      });

      await prisma.syncLog.create({
        data: {
          sageInvoiceId: invoice.id,
          source: "DOCUMENT_ENGINE",
          level: "ERROR",
          message: "Invoice PDF generation failed",
          context: {
            error: error instanceof Error ? error.message : "Unknown error"
          }
        }
      });

      logger.error("Invoice PDF generation failed", {
        invoiceId: invoice.id,
        error: error instanceof Error ? error.message : "Unknown error"
      });

      throw new DocumentGenerationError("Unable to generate invoice PDF", 500, "PDF_GENERATION_FAILED");
    }
  }

  async getDocumentFile(documentId: string): Promise<{
    fileName: string;
    mimeType: string;
    storagePath: string;
  }> {
    const document = await prisma.generatedDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        storagePath: true
      }
    });

    if (!document) {
      throw new DocumentGenerationError("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    try {
      await access(document.storagePath, fsConstants.R_OK);
    } catch {
      throw new DocumentGenerationError("Document file not found on storage", 404, "DOCUMENT_FILE_NOT_FOUND");
    }

    return {
      fileName: document.fileName,
      mimeType: document.mimeType,
      storagePath: document.storagePath
    };
  }

  private toNumber(value: Prisma.Decimal | number): number {
    return typeof value === "number" ? value : value.toNumber();
  }

  private parseSettingsValue(rawValue: string | null): StoredSettingsValue {
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

  private toLines(value: string | undefined): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
}
