import type { MappedSageInvoice, MappedSageInvoiceItem, SageHeaderRow, SageLineRow } from "./sage.types";

const DEFAULT_IMPORT_STATUS = "IMPORTED" as const;

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
    currencyCode: toStringOrNull(pickValue(row, ["DO_Devise", "currencyCode"])) ?? "RWF",
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
    itemName: toStringOrNull(pickValue(row, ["DL_Design", "itemName"])) ?? "Unknown item",
    quantity,
    unitPrice,
    discountAmount,
    taxRate: toNumber(pickValue(row, ["DL_Taxe1", "taxRate"]), 0),
    taxAmount,
    lineTotal: toNumber(
      pickValue(row, ["DL_MontantTTC", "DL_TotalTTC", "lineTotal"]),
      Math.max(quantity * unitPrice - discountAmount + taxAmount, 0)
    ),
    unitOfMeasure: toStringOrNull(pickValue(row, ["DL_Unite", "unitOfMeasure"]))
  };
}
