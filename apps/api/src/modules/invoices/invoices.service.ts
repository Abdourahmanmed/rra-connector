import type { Prisma } from "@prisma/client";
import prisma from "../../config/prisma";
import type { InvoiceDetailResponse, InvoiceListQuery, InvoiceListResponse } from "./invoices.types";

const RECENT_LOG_LIMIT = 20;

export class InvoicesService {
  async listInvoices(query: InvoiceListQuery): Promise<InvoiceListResponse> {
    const where = this.buildWhere(query);
    const skip = (query.page - 1) * query.pageSize;

    const [totalItems, invoices] = await prisma.$transaction([
      prisma.sageInvoice.count({ where }),
      prisma.sageInvoice.findMany({
        where,
        skip,
        take: query.pageSize,
        orderBy: {
          [query.sortBy]: query.sortOrder
        },
        select: {
          id: true,
          sagePiece: true,
          sageDocType: true,
          sageDocumentNo: true,
          customerCode: true,
          customerName: true,
          invoiceDate: true,
          dueDate: true,
          currencyCode: true,
          subtotalAmount: true,
          discountAmount: true,
          taxAmount: true,
          totalAmount: true,
          importStatus: true,
          fiscalStatus: true,
          pdfStatus: true,
          qrStatus: true,
          importedAt: true,
          updatedAt: true
        }
      })
    ]);

    return {
      items: invoices.map((invoice) => ({
        ...invoice,
        invoiceDate: invoice.invoiceDate.toISOString(),
        dueDate: invoice.dueDate?.toISOString() ?? null,
        subtotalAmount: this.toNumber(invoice.subtotalAmount),
        discountAmount: this.toNumber(invoice.discountAmount),
        taxAmount: this.toNumber(invoice.taxAmount),
        totalAmount: this.toNumber(invoice.totalAmount),
        importedAt: invoice.importedAt?.toISOString() ?? null,
        updatedAt: invoice.updatedAt.toISOString()
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / query.pageSize)
      }
    };
  }

  async getInvoiceById(id: string): Promise<InvoiceDetailResponse | null> {
    const invoice = await prisma.sageInvoice.findUnique({
      where: { id },
      include: {
        items: {
          orderBy: { lineNo: "asc" }
        },
        fiscalResult: true,
        documents: {
          orderBy: { createdAt: "desc" }
        },
        publicLinks: {
          orderBy: { createdAt: "desc" }
        },
        syncLogs: {
          orderBy: { createdAt: "desc" },
          take: RECENT_LOG_LIMIT
        }
      }
    });

    if (!invoice) {
      return null;
    }

    return {
      id: invoice.id,
      sagePiece: invoice.sagePiece,
      sageDocType: invoice.sageDocType,
      sageDocumentNo: invoice.sageDocumentNo,
      customerCode: invoice.customerCode,
      customerName: invoice.customerName,
      customerTin: invoice.customerTin,
      invoiceDate: invoice.invoiceDate.toISOString(),
      dueDate: invoice.dueDate?.toISOString() ?? null,
      currencyCode: invoice.currencyCode,
      exchangeRate: this.toNumber(invoice.exchangeRate),
      subtotalAmount: this.toNumber(invoice.subtotalAmount),
      discountAmount: this.toNumber(invoice.discountAmount),
      taxAmount: this.toNumber(invoice.taxAmount),
      totalAmount: this.toNumber(invoice.totalAmount),
      importStatus: invoice.importStatus,
      fiscalStatus: invoice.fiscalStatus,
      pdfStatus: invoice.pdfStatus,
      qrStatus: invoice.qrStatus,
      importedAt: invoice.importedAt?.toISOString() ?? null,
      lastAttemptAt: invoice.lastAttemptAt?.toISOString() ?? null,
      createdAt: invoice.createdAt.toISOString(),
      updatedAt: invoice.updatedAt.toISOString(),
      items: invoice.items.map((item) => ({
        id: item.id,
        lineNo: item.lineNo,
        itemCode: item.itemCode,
        itemName: item.itemName,
        quantity: this.toNumber(item.quantity),
        unitPrice: this.toNumber(item.unitPrice),
        discountAmount: this.toNumber(item.discountAmount),
        taxRate: this.toNumber(item.taxRate),
        taxAmount: this.toNumber(item.taxAmount),
        lineTotal: this.toNumber(item.lineTotal),
        unitOfMeasure: item.unitOfMeasure
      })),
      fiscalResult: invoice.fiscalResult
        ? {
            id: invoice.fiscalResult.id,
            rcptNo: invoice.fiscalResult.rcptNo,
            verificationUrl: invoice.fiscalResult.verificationUrl,
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
        storagePath: document.storagePath,
        fileSizeBytes: document.fileSizeBytes !== null ? Number(document.fileSizeBytes) : null,
        generatedAt: document.generatedAt?.toISOString() ?? null,
        expiresAt: document.expiresAt?.toISOString() ?? null
      })),
      publicLinks: invoice.publicLinks.map((link) => ({
        id: link.id,
        label: link.label,
        targetUrl: link.targetUrl,
        isRevoked: link.isRevoked,
        expiresAt: link.expiresAt?.toISOString() ?? null,
        lastAccessedAt: link.lastAccessedAt?.toISOString() ?? null,
        createdAt: link.createdAt.toISOString()
      })),
      recentLogs: invoice.syncLogs.map((log) => ({
        id: log.id,
        level: log.level,
        source: log.source,
        message: log.message,
        context: log.context,
        createdAt: log.createdAt.toISOString()
      }))
    };
  }

  private buildWhere(query: InvoiceListQuery): Prisma.SageInvoiceWhereInput {
    const search = query.search?.trim();

    return {
      ...(query.fiscalStatus ? { fiscalStatus: query.fiscalStatus } : {}),
      ...(query.importStatus ? { importStatus: query.importStatus } : {}),
      ...(search
        ? {
            OR: [
              { sagePiece: { contains: search, mode: "insensitive" } },
              { sageDocumentNo: { contains: search, mode: "insensitive" } },
              { customerName: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    };
  }

  private toNumber(decimalValue: Prisma.Decimal | number): number {
    return typeof decimalValue === "number" ? decimalValue : decimalValue.toNumber();
  }
}
