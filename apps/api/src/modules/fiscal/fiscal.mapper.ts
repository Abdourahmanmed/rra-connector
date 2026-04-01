import type { SageInvoice, SageInvoiceItem } from "@prisma/client";

export type VsdcSaleLinePayload = {
  lineNo: number;
  itemCode: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  unitOfMeasure: string | null;
};

export type VsdcSalePayload = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  customer: {
    code: string | null;
    name: string | null;
    tin: string | null;
  };
  currency: {
    code: string;
    exchangeRate: number;
  };
  totals: {
    subtotalAmount: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
  };
  lines: VsdcSaleLinePayload[];
};

export class FiscalMapper {
  toVsdcSalePayload(invoice: SageInvoice, items: SageInvoiceItem[]): VsdcSalePayload {
    return {
      invoiceId: invoice.id,
      invoiceNumber: invoice.sageDocumentNo ?? invoice.sagePiece,
      invoiceDate: invoice.invoiceDate.toISOString(),
      customer: {
        code: invoice.customerCode,
        name: invoice.customerName,
        tin: invoice.customerTin
      },
      currency: {
        code: invoice.currencyCode,
        exchangeRate: this.toNumber(invoice.exchangeRate)
      },
      totals: {
        subtotalAmount: this.toNumber(invoice.subtotalAmount),
        discountAmount: this.toNumber(invoice.discountAmount),
        taxAmount: this.toNumber(invoice.taxAmount),
        totalAmount: this.toNumber(invoice.totalAmount)
      },
      lines: items.map((item) => ({
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
      }))
    };
  }

  private toNumber(value: { toNumber(): number } | number): number {
    return typeof value === "number" ? value : value.toNumber();
  }
}
