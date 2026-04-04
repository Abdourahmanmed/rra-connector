import { readFile } from "node:fs/promises";
import { GenerationStatus, type Prisma } from "@prisma/client";
import prisma from "../../config/prisma";

class PublicInvoiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string
  ) {
    super(message);
  }
}

type PublicInvoiceDocument = {
  id: string;
  type: string;
  status: string;
  fileName: string;
  mimeType: string;
  generatedAt: string | null;
  expiresAt: string | null;
};

type PublicInvoicePayload = {
  invoice: {
    id: string;
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string | null;
    currencyCode: string;
    customerName: string | null;
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
    items: Array<{
      lineNo: number;
      itemName: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      taxRate: number;
      taxAmount: number;
      lineTotal: number;
      unitOfMeasure: string | null;
    }>;
  };
  fiscalResult: {
    rcptNo: string;
    verificationUrl: string | null;
    qrCodeData: string | null;
    fiscalDay: string | null;
    taxAmount: number | null;
    totalAmount: number | null;
    receivedAt: string | null;
  } | null;
  documents: PublicInvoiceDocument[];
};

type PublicInvoicePdfPayload = {
  fileName: string;
  mimeType: string;
  content: Buffer;
};

export class PublicService {
  async getPublicInvoiceByToken(rawToken: string): Promise<PublicInvoicePayload> {
    const token = this.validateToken(rawToken);
    const now = new Date();

    const link = await this.getValidPublicLink(token, now);

    await prisma.publicLink.update({
      where: { id: link.id },
      data: {
        lastAccessedAt: now
      }
    });

    const invoice = link.sageInvoice;

    return {
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.sageDocumentNo ?? invoice.sagePiece,
        invoiceDate: invoice.invoiceDate.toISOString(),
        dueDate: invoice.dueDate?.toISOString() ?? null,
        currencyCode: invoice.currencyCode,
        customerName: invoice.customerName,
        subtotalAmount: this.toNumber(invoice.subtotalAmount),
        discountAmount: this.toNumber(invoice.discountAmount),
        taxAmount: this.toNumber(invoice.taxAmount),
        totalAmount: this.toNumber(invoice.totalAmount),
        items: invoice.items.map((item) => ({
          lineNo: item.lineNo,
          itemName: item.itemName,
          quantity: this.toNumber(item.quantity),
          unitPrice: this.toNumber(item.unitPrice),
          discountAmount: this.toNumber(item.discountAmount),
          taxRate: this.toNumber(item.taxRate),
          taxAmount: this.toNumber(item.taxAmount),
          lineTotal: this.toNumber(item.lineTotal),
          unitOfMeasure: item.unitOfMeasure
        }))
      },
      fiscalResult: invoice.fiscalResult
        ? {
            rcptNo: invoice.fiscalResult.rcptNo,
            verificationUrl: invoice.fiscalResult.verificationUrl,
            qrCodeData: invoice.fiscalResult.qrCodeData,
            fiscalDay: invoice.fiscalResult.fiscalDay,
            taxAmount: invoice.fiscalResult.taxAmount !== null ? this.toNumber(invoice.fiscalResult.taxAmount) : null,
            totalAmount:
              invoice.fiscalResult.totalAmount !== null ? this.toNumber(invoice.fiscalResult.totalAmount) : null,
            receivedAt: invoice.fiscalResult.receivedAt?.toISOString() ?? null
          }
        : null,
      documents: invoice.documents.map((document) => ({
        id: document.id,
        type: document.type,
        status: document.status,
        fileName: document.fileName,
        mimeType: document.mimeType,
        generatedAt: document.generatedAt?.toISOString() ?? null,
        expiresAt: document.expiresAt?.toISOString() ?? null
      }))
    };
  }

  async getPublicInvoicePdfByToken(params: { token: string; documentId?: string }): Promise<PublicInvoicePdfPayload> {
    const token = this.validateToken(params.token);
    const now = new Date();

    const link = await this.getValidPublicLink(token, now);

    await prisma.publicLink.update({
      where: { id: link.id },
      data: {
        lastAccessedAt: now
      }
    });

    const availableDocuments = link.sageInvoice.documents.filter(
      (document) =>
        document.mimeType === "application/pdf" &&
        document.status === GenerationStatus.GENERATED &&
        (document.expiresAt === null || document.expiresAt > now)
    );

    const document = params.documentId
      ? availableDocuments.find((item) => item.id === params.documentId)
      : availableDocuments[0];

    if (!document) {
      throw new PublicInvoiceError("Invoice PDF not found", 404, "PUBLIC_PDF_NOT_FOUND");
    }

    try {
      const content = await readFile(document.storagePath);

      return {
        fileName: document.fileName,
        mimeType: document.mimeType,
        content
      };
    } catch {
      throw new PublicInvoiceError("Invoice PDF not available", 404, "PUBLIC_PDF_NOT_AVAILABLE");
    }
  }

  private async getValidPublicLink(token: string, now: Date) {
    const link = await prisma.publicLink.findUnique({
      where: { token },
      include: {
        sageInvoice: {
          include: {
            items: {
              orderBy: { lineNo: "asc" }
            },
            fiscalResult: true,
            documents: {
              orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }]
            }
          }
        }
      }
    });

    if (!link) {
      throw new PublicInvoiceError("Public invoice not found", 404, "PUBLIC_LINK_NOT_FOUND");
    }

    if (link.isRevoked) {
      throw new PublicInvoiceError("Public invoice is no longer available", 410, "PUBLIC_LINK_REVOKED");
    }

    if (link.expiresAt !== null && link.expiresAt <= now) {
      throw new PublicInvoiceError("Public invoice link has expired", 410, "PUBLIC_LINK_EXPIRED");
    }

    return link;
  }

  private validateToken(rawToken: string): string {
    const token = rawToken.trim();

    if (!token) {
      throw new PublicInvoiceError("Token is required", 400, "PUBLIC_TOKEN_REQUIRED");
    }

    if (token.length > 512) {
      throw new PublicInvoiceError("Invalid token", 400, "PUBLIC_TOKEN_INVALID");
    }

    return token;
  }

  private toNumber(value: Prisma.Decimal | number): number {
    return typeof value === "number" ? value : value.toNumber();
  }
}

export { PublicInvoiceError };
