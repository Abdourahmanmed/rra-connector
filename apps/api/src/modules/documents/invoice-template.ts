type InvoiceTemplateItem = {
  lineNo: number;
  itemReference: string;
  description: string;
  batchNumber: string | null;
  expiryDate: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalTaxIncl: number;
};

type FiscalTemplateData = {
  sdcId: string | null;
  receiptNumber: string | null;
  receiptSignature: string | null;
  internalData: string | null;
  date: string | null;
  time: string | null;
  cisDate: string | null;
  totalTax: number | null;
  totalAmount: number | null;
  itemsNumber: number | null;
  mrc: string | null;
};

type InvoiceTemplateData = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceReference: string;
  invoiceDate: string;
  invoiceTime: string;
  currencyCode: string;
  customer: {
    name: string;
    tin: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
  };
  seller: {
    companyName: string;
    tin: string;
    phone: string | null;
    email: string | null;
    address: string;
    website: string | null;
  };
  logoUrl: string | null;
  secondaryLogoUrl: string | null;
  paymentMode: string | null;
  paymentAmount: number | null;
  doneBy: string | null;
  bankDetails: string[];
  totals: {
    base: number;
    taxRate: number;
    vat: number;
    totalExclusive: number;
    totalInclusive: number;
    netAmount: number;
  };
  fiscal: FiscalTemplateData;
  items: InvoiceTemplateItem[];
};

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safe(value: string | null | undefined, placeholder = "-"): string {
  if (!value || !value.trim()) {
    return placeholder;
  }

  return escapeHtml(value.trim());
}

function safeEmpty(value: string | null | undefined): string {
  if (!value || !value.trim()) {
    return "";
  }

  return escapeHtml(value.trim());
}

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ` ${escapeHtml(currencyCode)}`;
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(value);
}

function renderBankDetails(lines: string[]): string {
  if (lines.length === 0) {
    return "<li>-</li>";
  }

  return lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("");
}

function fiscalValue(value: string | number | null): string {
  if (value === null || value === "") {
    return "____________";
  }

  return escapeHtml(String(value));
}

export function buildInvoiceHtml(data: InvoiceTemplateData): string {
  const rows = data.items
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.itemReference)}</td>
        <td>${escapeHtml(item.description)}</td>
        <td>${safe(item.batchNumber)}</td>
        <td>${safe(item.expiryDate)}</td>
        <td class="num">${formatQuantity(item.quantity)}</td>
        <td class="num">${formatMoney(item.unitPrice, data.currencyCode)}</td>
        <td class="num">${formatMoney(item.taxAmount, data.currencyCode)}</td>
        <td class="num">${formatMoney(item.totalTaxIncl, data.currencyCode)}</td>
      </tr>`
    )
    .join("");

  const logoHtml = data.logoUrl ? `<img src="${escapeHtml(data.logoUrl)}" alt="Company logo" class="logo" />` : `<div class="logo logo-placeholder"></div>`;
  const secondaryLogoHtml = data.secondaryLogoUrl
    ? `<img src="${escapeHtml(data.secondaryLogoUrl)}" alt="Secondary logo" class="secondary-logo" />`
    : `<div class="secondary-logo"></div>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${escapeHtml(data.invoiceNumber)}</title>
  <style>
    @page { size: A4; margin: 8mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 10px; background: #ffffff; }
    .invoice { border: 1px solid #d8d8d8; padding: 8px 10px; min-height: 280mm; display: flex; flex-direction: column; }
    .top { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 10px; }
    .left-head { display: grid; grid-template-columns: 78px 1fr; gap: 8px; }
    .logo { width: 76px; height: 76px; object-fit: contain; border-radius: 50%; }
    .logo-placeholder { border: 1px solid #d1d5db; background: #f3f4f6; }
    .company p, .customer p, .meta-row p, .fiscal-grid p { margin: 0 0 2px; }
    .company p { color: #0018ff; font-weight: 700; line-height: 1.1; font-size: 11px; }
    .top-right { display: flex; justify-content: flex-end; align-items: flex-start; }
    .secondary-logo { width: 170px; height: 76px; object-fit: contain; }
    .invoice-title { margin: 10px 0 6px; display: flex; align-items: center; gap: 6px; }
    .invoice-title h1 { margin: 0; font-size: 42px; letter-spacing: 0.3px; font-weight: 500; line-height: 1; }
    .pill { background: #cfcfcf; border-radius: 8px; padding: 6px 10px; font-weight: 700; min-width: 98px; text-align: left; font-size: 28px; line-height: 1; }
    .badge-value { font-size: 25px; }
    .right-head { margin-top: 24px; }
    .customer { background: #cfcfcf; border-radius: 7px; padding: 7px 8px; min-height: 102px; }
    .customer p { line-height: 1.25; font-size: 10px; }
    .customer .customer-name { font-size: 27px; font-weight: 700; margin-bottom: 2px; }
    .label { font-size: 9px; font-weight: 700; color: #0a0a0a; }
    .badge-row { display: grid; grid-template-columns: auto 1fr 1fr 1.2fr; gap: 3px; margin: 4px 0 2px; align-items: center; }
    .badge-row .small-pill { min-height: 18px; font-size: 10px; display: flex; align-items: center; }
    .small-pill { background: #cfcfcf; border-radius: 8px; padding: 2px 6px; min-height: 20px; line-height: 1.2; }
    .meta-row { margin-top: 7px; display: grid; grid-template-columns: 116px 1fr 1fr; gap: 6px; align-items: center; }
    .meta-row p { font-size: 15px; }
    .meta-value { color: #0018ff; font-weight: 700; }
    .rule { border-top: 1px solid #1d4ed8; margin: 8px 0 8px; }
    table { width: 100%; border-collapse: separate; border-spacing: 0 2px; }
    thead th { background: #bdbdbd; font-size: 9px; text-align: left; padding: 3px 5px; white-space: nowrap; }
    thead th:first-child { border-top-left-radius: 7px; border-bottom-left-radius: 7px; }
    thead th:last-child { border-top-right-radius: 7px; border-bottom-right-radius: 7px; }
    tbody td { background: #cfcfcf; padding: 3px 5px; font-size: 9px; }
    tbody tr td:first-child { border-top-left-radius: 6px; border-bottom-left-radius: 6px; }
    tbody tr td:last-child { border-top-right-radius: 6px; border-bottom-right-radius: 6px; }
    .num { text-align: right; white-space: nowrap; }
    .totals-header, .totals-values { margin-top: 3px; margin-left: auto; width: 73%; display: grid; grid-template-columns: .9fr .8fr .8fr 1.3fr 1.3fr 1.2fr; gap: 0; }
    .totals-header p { background: #a5a5a5; margin: 0; padding: 4px 3px; text-align: center; font-size: 8px; font-weight: 700; white-space: nowrap; }
    .totals-header p:first-child { border-top-left-radius: 7px; border-bottom-left-radius: 7px; }
    .totals-header p:last-child { border-top-right-radius: 7px; border-bottom-right-radius: 7px; }
    .totals-values p { background: #cfcfcf; margin: 0; padding: 5px 3px; text-align: center; }
    .totals-values p:first-child { border-top-left-radius: 7px; border-bottom-left-radius: 7px; }
    .totals-values p:last-child { border-top-right-radius: 7px; border-bottom-right-radius: 7px; }
    .totals-values p:last-child { font-weight: 700; }
    .bottom-wrap { margin-top: auto; padding-top: 10px; }
    .bottom { border-top: 1px solid #0018ff; border-bottom: 1px solid #0018ff; padding: 5px 1px; display: grid; grid-template-columns: 0.9fr 1.3fr 0.95fr; gap: 10px; color: #0018ff; }
    .bottom h4 { color: #0018ff; margin: 0 0 5px; font-size: 14px; font-weight: 700; }
    .bank { color: #111827; }
    .bank ul { margin: 0; padding-left: 12px; font-size: 10px; }
    .fiscal-grid { display: grid; grid-template-columns: 1.25fr 1fr; row-gap: 2px; column-gap: 6px; font-size: 10px; }
    .fiscal-grid p { margin: 0; font-weight: 700; }
    .muted-value { color: #0018ff; font-weight: 700; }
  </style>
</head>
<body>
  <main class="invoice">
    <section class="top">
      <div>
        <div class="left-head">
        ${logoHtml}
        <div class="company">
          <p>${escapeHtml(data.seller.companyName)}</p>
          <p>${safeEmpty(data.seller.address)}</p>
          <p>TIN/VAT : ${safe(data.seller.tin)}</p>
          <p>Tel: ${safe(data.seller.phone)}</p>
          <p>Avenue ${safe(data.seller.address)}</p>
          <p>E-mail: ${safe(data.seller.email)}</p>
          <p>Website: ${safe(data.seller.website)}</p>
        </div>
        </div>
        <div class="invoice-title">
          <h1>INVOICE</h1>
          <div class="pill"><span class="badge-value">${escapeHtml(data.invoiceNumber)}</span></div>
        </div>
        <div class="badge-row">
          <p class="small-pill label">Date</p>
          <p class="small-pill">${escapeHtml(data.invoiceDate)}</p>
          <p class="small-pill">${escapeHtml(data.invoiceTime)}</p>
          <p></p>
        </div>
        <div class="badge-row">
          <p class="small-pill label">Customer reference</p>
          <p class="small-pill" style="grid-column: span 3;">${safe(data.invoiceReference, "")}</p>
        </div>
        <div class="meta-row">
          <p class="label">Done by :</p>
          <p class="meta-value">${safe(data.doneBy)}</p>
          <p></p>
        </div>
        <div class="meta-row">
          <p class="label">Payment mode :</p>
          <p class="meta-value">${safe(data.paymentMode)}</p>
          <p class="meta-value">${formatMoney(data.paymentAmount ?? data.totals.netAmount, data.currencyCode)}</p>
        </div>
      </div>
      <div>
        <div class="top-right">
          ${secondaryLogoHtml}
        </div>
        <div class="right-head">
          <div class="customer">
            <p class="label">${escapeHtml(data.invoiceId)}</p>
            <p class="customer-name">${escapeHtml(data.customer.name)}</p>
            <p><strong>TIN :</strong> ${safe(data.customer.tin)}</p>
            <p><strong>TEL :</strong> ${safe(data.customer.phone)}</p>
            <p><strong>Email :</strong> ${safe(data.customer.email)}</p>
            <p><strong>Adresse :</strong> ${safe(data.customer.address)}</p>
          </div>
        </div>
      </div>
    </section>

    <div class="rule"></div>

    <table>
      <thead>
        <tr>
          <th>Article ref.</th>
          <th>Description</th>
          <th>Batch #</th>
          <th>Exp. date</th>
          <th class="num">Qty</th>
          <th class="num">Unit Price</th>
          <th class="num">Tax</th>
          <th class="num">TOTAL Tax Incl.</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals-header">
      <p>Base</p><p>RATE</p><p>VAT</p><p>Total exclusive of tax</p><p>Total inclusive of tax</p><p>NET AMOUNT</p>
    </div>
    <div class="totals-values">
      <p>${formatMoney(data.totals.base, data.currencyCode)}</p>
      <p>${data.totals.taxRate}%</p>
      <p>${formatMoney(data.totals.vat, data.currencyCode)}</p>
      <p>${formatMoney(data.totals.totalExclusive, data.currencyCode)}</p>
      <p>${formatMoney(data.totals.totalInclusive, data.currencyCode)}</p>
      <p>${formatMoney(data.paymentAmount ?? data.totals.netAmount, data.currencyCode)}</p>
    </div>

    <div class="bottom-wrap">
      <section class="bottom">
        <div class="bank">
          <h4>Bank details :</h4>
          <ul>${renderBankDetails(data.bankDetails)}</ul>
        </div>
        <div>
          <h4>SDC INFORMATION</h4>
          <div class="fiscal-grid">
            <p>SDC ID:</p><p class="muted-value">${fiscalValue(data.fiscal.sdcId)}</p>
            <p>DATE:</p><p class="muted-value">${fiscalValue(data.fiscal.date)}</p>
            <p>TIME:</p><p class="muted-value">${fiscalValue(data.fiscal.time)}</p>
            <p>RECEIPT NUMBER:</p><p class="muted-value">${fiscalValue(data.fiscal.receiptNumber)}</p>
            <p>Internal Data:</p><p class="muted-value">${fiscalValue(data.fiscal.internalData)}</p>
            <p>SIGNATURE:</p><p class="muted-value">${fiscalValue(data.fiscal.receiptSignature)}</p>
            <p>RECEIPT NUMBER:</p><p class="muted-value">${fiscalValue(data.fiscal.receiptNumber)}</p>
            <p>CIS DATE:</p><p class="muted-value">${fiscalValue(data.fiscal.cisDate)}</p>
          </div>
        </div>
        <div>
          <h4>SDC INFORMATION</h4>
          <div class="fiscal-grid">
            <p>TOTAL TAX</p><p class="muted-value">${fiscalValue(data.fiscal.totalTax !== null ? formatMoney(data.fiscal.totalTax, data.currencyCode) : null)}</p>
            <p>TOTAL AMOUNT</p><p class="muted-value">${fiscalValue(data.fiscal.totalAmount !== null ? formatMoney(data.fiscal.totalAmount, data.currencyCode) : null)}</p>
            <p>ITEMS NUMBER</p><p class="muted-value">${fiscalValue(data.fiscal.itemsNumber)}</p>
            <p>MRC:</p><p class="muted-value">${fiscalValue(data.fiscal.mrc)}</p>
          </div>
        </div>
      </section>
    </div>
  </main>
</body>
</html>`;
}
