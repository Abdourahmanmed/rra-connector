import { FiscalStatus, PdfStatus } from "@prisma/client";
import prisma from "../../config/prisma";

const RECENT_INVOICES_LIMIT = 10;

export type DashboardSummary = {
  totals: {
    importedInvoices: number;
    successfulFiscalizations: number;
    failedFiscalizations: number;
    pendingInvoices: number;
    generatedPdfs: number;
  };
  recentInvoices: Array<{
    id: string;
    sagePiece: string;
    sageDocumentNo: string | null;
    customerName: string | null;
    invoiceDate: string;
    totalAmount: number;
    importStatus: string;
    fiscalStatus: string;
    pdfStatus: string;
    updatedAt: string;
  }>;
};

export class DashboardService {
  async getSummary(): Promise<DashboardSummary> {
    const [
      importedInvoices,
      successfulFiscalizations,
      failedFiscalizations,
      pendingInvoices,
      generatedPdfs,
      recentInvoices
    ] = await prisma.$transaction([
      prisma.sageInvoice.count({
        where: {
          importedAt: { not: null }
        }
      }),
      prisma.sageInvoice.count({
        where: {
          fiscalStatus: FiscalStatus.ACCEPTED
        }
      }),
      prisma.sageInvoice.count({
        where: {
          fiscalStatus: {
            in: [FiscalStatus.REJECTED, FiscalStatus.ERROR]
          }
        }
      }),
      prisma.sageInvoice.count({
        where: {
          fiscalStatus: {
            in: [FiscalStatus.NOT_SUBMITTED, FiscalStatus.QUEUED, FiscalStatus.SUBMITTED]
          }
        }
      }),
      prisma.sageInvoice.count({
        where: {
          pdfStatus: PdfStatus.GENERATED
        }
      }),
      prisma.sageInvoice.findMany({
        orderBy: {
          updatedAt: "desc"
        },
        take: RECENT_INVOICES_LIMIT,
        select: {
          id: true,
          sagePiece: true,
          sageDocumentNo: true,
          customerName: true,
          invoiceDate: true,
          totalAmount: true,
          importStatus: true,
          fiscalStatus: true,
          pdfStatus: true,
          updatedAt: true
        }
      })
    ]);

    return {
      totals: {
        importedInvoices,
        successfulFiscalizations,
        failedFiscalizations,
        pendingInvoices,
        generatedPdfs
      },
      recentInvoices: recentInvoices.map((invoice) => ({
        id: invoice.id,
        sagePiece: invoice.sagePiece,
        sageDocumentNo: invoice.sageDocumentNo,
        customerName: invoice.customerName,
        invoiceDate: invoice.invoiceDate.toISOString(),
        totalAmount: invoice.totalAmount.toNumber(),
        importStatus: invoice.importStatus,
        fiscalStatus: invoice.fiscalStatus,
        pdfStatus: invoice.pdfStatus,
        updatedAt: invoice.updatedAt.toISOString()
      }))
    };
  }
}
