import type { Prisma } from "@prisma/client";
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

export class PublicService {
  async getPublicInvoiceByToken(rawToken: string): Promise<PublicInvoicePayload> {
    const token = rawToken.trim();

    if (!token) {
      throw new PublicInvoiceError("Token is required", 400, "PUBLIC_TOKEN_REQUIRED");
    }

    if (token.length > 512) {
      throw new PublicInvoiceError("Invalid token", 400, "PUBLIC_TOKEN_INVALID");
    }

    const now = new Date();

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
              orderBy: { createdAt: "desc" }
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

  private toNumber(value: Prisma.Decimal | number): number {
    return typeof value === "number" ? value : value.toNumber();
  }
}

export { PublicInvoiceError };
