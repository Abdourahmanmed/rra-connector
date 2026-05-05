import type { MappedSageInvoice, MappedSageInvoiceItem, SageHeaderRow, SageLineRow } from "./sage.types";

const DEFAULT_IMPORT_STATUS = "IMPORTED" as const;
const DEFAULT_CURRENCY_CODE = "RWF";

function pickValue(row: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row && row[key] !== undefined && row[key] !== null) {
      return row[key];
    }
  }

  return null;
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = String(value).trim();
  return parsed.length > 0 ? parsed : null;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}


function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateOrNull(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function toDate(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return fallback;
}

function toCurrencyCode(value: unknown, fallback = DEFAULT_CURRENCY_CODE): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toUpperCase();
  if (normalized.length !== 3 || normalized === "0") {
    return fallback;
  }

  return normalized;
}

export function mapSageInvoiceHeader(row: SageHeaderRow): MappedSageInvoice {
  const now = new Date();
  const invoiceDate = toDate(pickValue(row, ["DO_Date", "invoiceDate"]), now);
  const dueDate = toDate(pickValue(row, ["DO_DateEch", "dueDate"]), invoiceDate);
  const sourceUpdatedAt = toDate(
    pickValue(row, ["cbModification", "cbModificationUser", "DO_Date", "sourceUpdatedAt"]),
    invoiceDate
  );

  const subtotalAmount = toNumber(pickValue(row, ["DO_TotalHT", "DO_TotHT", "subtotalAmount"]));
  const totalAmount = toNumber(pickValue(row, ["DO_TotalTTC", "DO_TotTTC", "totalAmount"]));
  const taxAmountCandidate = toNumber(pickValue(row, ["DO_TotalTaxe", "DO_Taxe", "taxAmount"]));

  return {
    sagePiece: toStringOrNull(pickValue(row, ["DO_Piece", "sagePiece"])) ?? "",
    sageDocType: String(toNumber(pickValue(row, ["DO_Type", "sageDocType"]), 7)),
    sageDocumentNo: toStringOrNull(pickValue(row, ["DO_Ref", "DO_Num", "sageDocumentNo"])),
    customerCode: toStringOrNull(pickValue(row, ["CT_Num", "customerCode"])),
    customerName: toStringOrNull(pickValue(row, ["DO_Tiers", "CT_Intitule", "customerName"])),
    customerTin: toStringOrNull(pickValue(row, ["CT_Identifiant", "customerTin"])),
    customerReference: toStringOrNull(pickValue(row, ["DO_Tiers", "CT_Num", "customerReference"])),
    customerPhone: toStringOrNull(pickValue(row, ["CT_Telephone", "customerPhone"])),
    customerEmail: toStringOrNull(pickValue(row, ["CT_EMail", "customerEmail"])),
    customerAddress: toStringOrNull(pickValue(row, ["customerAddress", "CT_Adresse", "CT_AdresseLiv"])),
    sellerName: toStringOrNull(pickValue(row, ["sellerName", "CO_Intitule", "DE_Intitule"])),
    sellerTin: toStringOrNull(pickValue(row, ["sellerTin", "CO_Identifiant"])),
    sellerPhone: toStringOrNull(pickValue(row, ["sellerPhone", "CO_Telephone"])),
    sellerEmail: toStringOrNull(pickValue(row, ["sellerEmail", "CO_EMail"])),
    sellerAddress: toStringOrNull(pickValue(row, ["sellerAddress", "CO_Adresse"])),
    sellerWebsite: toStringOrNull(pickValue(row, ["sellerWebsite", "CO_Site"])),
    paymentMode: toStringOrNull(pickValue(row, ["paymentMode", "DO_Reglement", "N_Reglement"])),
    paymentAmount: toNumber(pickValue(row, ["paymentAmount", "DO_TotalTTC", "DO_TotTTC"]), totalAmount),
    doneBy: toStringOrNull(pickValue(row, ["doneBy", "cbCreateur", "cbModificationUser"])),
    invoiceTime: toStringOrNull(pickValue(row, ["invoiceTime", "DO_Heure"])),
    invoiceReference: toStringOrNull(pickValue(row, ["invoiceReference", "DO_Ref", "DO_Piece"])),
    sageStatus: toStringOrNull(pickValue(row, ["sageStatus", "DO_Statut"])),
    bankDetails: toStringOrNull(pickValue(row, ["bankDetails"])),
    currencyCode: toCurrencyCode(pickValue(row, ["DO_Devise", "currencyCode"])),
    exchangeRate: toNumber(pickValue(row, ["DO_Cours", "exchangeRate"]), 1),
    invoiceDate,
    dueDate,
    subtotalAmount,
    discountAmount: toNumber(pickValue(row, ["DO_Remise", "discountAmount"]), 0),
    taxAmount: taxAmountCandidate || Math.max(totalAmount - subtotalAmount, 0),
    totalAmount,
    sourceUpdatedAt,
    importStatus: DEFAULT_IMPORT_STATUS
  };
}

export function mapSageInvoiceLine(row: SageLineRow, index: number): MappedSageInvoiceItem {
  const quantity = toNumber(pickValue(row, ["DL_Qte", "quantity"]), 0);
  const unitPrice = toNumber(pickValue(row, ["DL_PrixUnitaire", "DL_PUTTC", "unitPrice"]), 0);
  const discountAmount = toNumber(pickValue(row, ["DL_Remise", "discountAmount"]), 0);
  const taxAmount = toNumber(pickValue(row, ["DL_MontantTaxe", "taxAmount"]), 0);

  return {
    lineNo: Math.max(1, Math.trunc(toNumber(pickValue(row, ["DL_Ligne", "lineNo"]), index + 1))),
    itemCode: toStringOrNull(pickValue(row, ["AR_Ref", "itemCode"])),
    sourceLineReference: toStringOrNull(pickValue(row, ["sourceLineReference", "DL_No"])),
    itemName: toStringOrNull(pickValue(row, ["DL_Design", "itemName"])) ?? "Unknown item",
    quantity,
    unitPrice,
    discountAmount,
    taxRate: toNumber(pickValue(row, ["DL_Taxe1", "taxRate"]), 0),
    taxAmount,
    taxIncludedTotal: toNumberOrNull(pickValue(row, ["DL_MontantTTC", "taxIncludedTotal"])),
    taxLabel: toStringOrNull(pickValue(row, ["taxLabel", "DL_Taxe1", "TA_Intitule"])),
    batchNumber: toStringOrNull(pickValue(row, ["batchNumber", "DL_NoLot"])),
    expiryDate: toDateOrNull(pickValue(row, ["expiryDate", "DL_DatePeremption"])),
    lineTotal: toNumber(
      pickValue(row, ["DL_MontantTTC", "DL_TotalTTC", "lineTotal"]),
      Math.max(quantity * unitPrice - discountAmount + taxAmount, 0)
    ),
    unitOfMeasure: toStringOrNull(pickValue(row, ["DL_Unite", "unitOfMeasure"]))
  };
}
