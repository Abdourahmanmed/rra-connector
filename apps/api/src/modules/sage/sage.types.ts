export type SqlServerRow = Record<string, unknown>;

export type SageHeaderRow = SqlServerRow;

export type SageLineRow = SqlServerRow;

export type MappedSageInvoiceItem = {
  lineNo: number;
  itemCode: string | null;
  sourceLineReference: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  taxIncludedTotal: number | null;
  taxLabel: string | null;
  batchNumber: string | null;
  expiryDate: Date | null;
  lineTotal: number;
  unitOfMeasure: string | null;
};

export type MappedSageInvoice = {
  sagePiece: string;
  sageDocType: string;
  sageDocumentNo: string | null;
  customerCode: string | null;
  customerName: string | null;
  customerTin: string | null;
  customerReference: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  sellerName: string | null;
  sellerTin: string | null;
  sellerPhone: string | null;
  sellerEmail: string | null;
  sellerAddress: string | null;
  sellerWebsite: string | null;
  paymentMode: string | null;
  paymentAmount: number | null;
  doneBy: string | null;
  invoiceTime: string | null;
  invoiceReference: string | null;
  sageStatus: string | null;
  bankDetails: string | null;
  currencyCode: string;
  exchangeRate: number;
  invoiceDate: Date;
  dueDate: Date | null;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  sourceUpdatedAt: Date;
  importStatus: "IMPORTED";
};

export type SyncInvoicesResult = { synced: number; inserted: number; updated: number; skipped: number; checkpoint: string | null };
export type TestReadResult = { count: number; sample: Array<{ sagePiece: string; sageDocType: string; invoiceDate: string; customerCode: string | null }> };
