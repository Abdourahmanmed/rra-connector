import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { DocumentType, FiscalStatus, GenerationStatus, PdfStatus, type Prisma } from "@prisma/client";
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
};

export class DocumentsService {
  async generateInvoicePdf(invoiceId: string): Promise<GeneratePdfResult> {
    const invoice = await prisma.sageInvoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: { orderBy: { lineNo: "asc" } },
        fiscalResult: true
      }
    });

    if (!invoice) {
      throw new DocumentGenerationError("Invoice not found", 404, "INVOICE_NOT_FOUND");
    }

    if (invoice.fiscalStatus !== FiscalStatus.ACCEPTED || !invoice.fiscalResult) {
      throw new DocumentGenerationError(
        "Invoice must be fiscalized successfully before PDF generation",
        409,
        "INVOICE_NOT_FISCALIZED"
      );
    }

    await prisma.sageInvoice.update({
      where: { id: invoice.id },
      data: { pdfStatus: PdfStatus.PENDING }
    });

    try {
      const html = buildInvoiceHtml({
        invoiceId: invoice.id,
        invoiceNumber: invoice.sageDocumentNo ?? invoice.sagePiece,
        invoiceDate: invoice.invoiceDate.toISOString().slice(0, 10),
        dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : null,
        currencyCode: invoice.currencyCode,
        customerName: invoice.customerName ?? "Walk-in customer",
        customerTin: invoice.customerTin ?? "N/A",
        companyName: Env.COMPANY_NAME,
        companyTin: Env.COMPANY_TIN,
        companyAddress: Env.COMPANY_ADDRESS,
        subtotalAmount: this.toNumber(invoice.subtotalAmount),
        discountAmount: this.toNumber(invoice.discountAmount),
        taxAmount: this.toNumber(invoice.taxAmount),
        totalAmount: this.toNumber(invoice.totalAmount),
        rcptNo: invoice.fiscalResult.rcptNo,
        verificationUrl: invoice.fiscalResult.verificationUrl,
        qrCodeData: invoice.fiscalResult.qrCodeData,
        items: invoice.items.map((item) => ({
          lineNo: item.lineNo,
          itemName: item.itemName,
          quantity: this.toNumber(item.quantity),
          unitPrice: this.toNumber(item.unitPrice),
          taxRate: this.toNumber(item.taxRate),
          taxAmount: this.toNumber(item.taxAmount),
          lineTotal: this.toNumber(item.lineTotal)
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
            margin: { top: "12mm", right: "10mm", bottom: "12mm", left: "10mm" }
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
            message: "Invoice PDF generated",
            context: {
              documentId: created.id,
              storagePath: fullPath,
              fileSizeBytes: pdfBuffer.length
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
        generatedAt: generatedAt.toISOString()
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

  private toNumber(value: Prisma.Decimal | number): number {
    return typeof value === "number" ? value : value.toNumber();
  }
}
