import type {
  DocumentType,
  FiscalStatus,
  GenerationStatus,
  InvoiceImportStatus,
  LogLevel,
  LogSource,
  PdfStatus,
  QrStatus
} from "@prisma/client";

export type InvoiceListQuery = {
  page: number;
  pageSize: number;
  fiscalStatus?: FiscalStatus;
  importStatus?: InvoiceImportStatus;
  search?: string;
  sortBy: "invoiceDate" | "totalAmount" | "createdAt";
  sortOrder: "asc" | "desc";
};

export type InvoiceListItem = {
  id: string;
  sagePiece: string;
  sageDocType: string;
  sageDocumentNo: string | null;
  customerCode: string | null;
  customerName: string | null;
  invoiceDate: string;
  dueDate: string | null;
  currencyCode: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  importStatus: InvoiceImportStatus;
  fiscalStatus: FiscalStatus;
  pdfStatus: PdfStatus;
  qrStatus: QrStatus;
  importedAt: string | null;
  updatedAt: string;
};

export type InvoiceListResponse = {
  items: InvoiceListItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};

export type InvoiceDetailItem = {
  id: string;
  lineNo: number;
  itemCode: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  taxIncludedTotal: number | null;
  taxLabel: string | null;
  batchNumber: string | null;
  expiryDate: string | null;
  lineTotal: number;
  unitOfMeasure: string | null;
};

export type InvoiceDocument = {
  id: string;
  type: DocumentType;
  status: GenerationStatus;
  fileName: string;
  mimeType: string;
  storagePath: string;
  fileSizeBytes: number | null;
  generatedAt: string | null;
  expiresAt: string | null;
  downloadUrl: string;
};

export type InvoicePublicLink = {
  id: string;
  label: string | null;
  targetUrl: string;
  isRevoked: boolean;
  expiresAt: string | null;
  lastAccessedAt: string | null;
  createdAt: string;
};

export type InvoiceLog = {
  id: string;
  level: LogLevel;
  source: LogSource;
  message: string;
  createdAt: string;
  context: unknown;
};

export type InvoiceDetailResponse = {
  id: string;
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
  invoiceDate: string;
  dueDate: string | null;
  currencyCode: string;
  exchangeRate: number;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  importStatus: InvoiceImportStatus;
  fiscalStatus: FiscalStatus;
  pdfStatus: PdfStatus;
  qrStatus: QrStatus;
  importedAt: string | null;
  lastAttemptAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: InvoiceDetailItem[];
  fiscalResult: {
    id: string;
    rcptNo: string;
    verificationUrl: string | null;
    fiscalDay: string | null;
    taxAmount: number | null;
    totalAmount: number | null;
    receivedAt: string | null;
  } | null;
  documents: InvoiceDocument[];
  publicLinks: InvoicePublicLink[];
  recentLogs: InvoiceLog[];
};
