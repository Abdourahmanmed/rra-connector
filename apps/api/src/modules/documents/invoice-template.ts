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
  paymentMode: string | null;
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

  const logoHtml = data.logoUrl ? `<img src="${escapeHtml(data.logoUrl)}" alt="Company logo" class="logo" />` : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Invoice ${escapeHtml(data.invoiceNumber)}</title>
  <style>
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 11px; }
    .invoice { border: 1px solid #d1d5db; padding: 12px; min-height: 273mm; }
    .top { display: flex; justify-content: space-between; gap: 12px; }
    .left-head { display: flex; gap: 10px; }
    .logo { width: 84px; height: 84px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 50%; padding: 4px; }
    .company p, .customer p, .meta-row p, .totals-row p, .fiscal-grid p { margin: 0 0 2px; }
    .company p { color: #1d4ed8; font-weight: 600; }
    .invoice-title { margin: 10px 0 8px; display: flex; align-items: center; gap: 8px; }
    .invoice-title h1 { margin: 0; font-size: 38px; letter-spacing: 1px; font-weight: 500; }
    .pill { background: #d1d5db; border-radius: 8px; padding: 6px 10px; font-weight: 700; min-width: 95px; text-align: center; }
    .right-head { flex: 1; max-width: 320px; }
    .customer { background: #d1d5db; border-radius: 8px; padding: 10px; min-height: 130px; }
    .label { font-size: 10px; font-weight: 700; color: #111827; }
    .meta { margin-top: 4px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
    .meta-row { margin-top: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; align-items: center; }
    .small-pill { background: #d1d5db; border-radius: 8px; padding: 4px 8px; min-height: 22px; }
    .rule { border-top: 1px solid #9ca3af; margin: 12px 0; }
    table { width: 100%; border-collapse: separate; border-spacing: 0 2px; }
    thead th { background: #c4c4c4; font-size: 10px; text-align: left; padding: 5px 6px; }
    tbody td { background: #d1d5db; padding: 5px 6px; }
    .num { text-align: right; white-space: nowrap; }
    .totals-header, .totals-values { margin-top: 10px; margin-left: auto; width: 70%; display: grid; grid-template-columns: 1fr 1fr 1fr 1.3fr 1.3fr 1.3fr; gap: 2px; }
    .totals-header p { background: #a3a3a3; margin: 0; padding: 5px; text-align: center; font-size: 10px; font-weight: 700; }
    .totals-values p { background: #d1d5db; margin: 0; padding: 6px; text-align: center; }
    .totals-values p:last-child { font-weight: 700; }
    .bottom { margin-top: 110px; border-top: 2px solid #1d4ed8; border-bottom: 2px solid #1d4ed8; padding: 8px 0; display: grid; grid-template-columns: 1.1fr 1fr 1fr; gap: 12px; }
    .bottom h4 { color: #1d4ed8; margin: 0 0 6px; font-size: 12px; }
    .bank ul { margin: 0; padding-left: 16px; }
    .fiscal-grid { display: grid; grid-template-columns: 1.4fr 1fr; row-gap: 3px; column-gap: 8px; }
  </style>
</head>
<body>
  <main class="invoice">
    <section class="top">
      <div class="left-head">
        ${logoHtml}
        <div class="company">
          <p>${escapeHtml(data.seller.companyName)}</p>
          <p>TIN/VAT : ${safe(data.seller.tin)}</p>
          <p>Tel: ${safe(data.seller.phone)}</p>
          <p>Address: ${safe(data.seller.address)}</p>
          <p>E-mail: ${safe(data.seller.email)}</p>
          <p>Website: ${safe(data.seller.website)}</p>
          <div class="invoice-title">
            <h1>INVOICE</h1>
            <div class="pill">${escapeHtml(data.invoiceNumber)}</div>
          </div>
          <div class="meta">
            <p class="small-pill">${escapeHtml(data.invoiceDate)}</p>
            <p class="small-pill">${escapeHtml(data.invoiceTime)}</p>
            <p class="small-pill">${safe(data.invoiceReference)}</p>
          </div>
          <div class="meta-row">
            <p class="label">Done by :</p>
            <p style="color:#1d4ed8;font-weight:700;">${safe(data.doneBy)}</p>
          </div>
          <div class="meta-row">
            <p class="label">Payment mode :</p>
            <p style="color:#1d4ed8;font-weight:700;">${safe(data.paymentMode)} ${escapeHtml(data.currencyCode)}</p>
          </div>
        </div>
      </div>
      <div class="right-head">
        <div class="customer">
          <p class="label">${escapeHtml(data.invoiceId)}</p>
          <p style="font-size:24px;font-weight:700">${escapeHtml(data.customer.name)}</p>
          <p><strong>TIN :</strong> ${safe(data.customer.tin)}</p>
          <p><strong>TEL :</strong> ${safe(data.customer.phone)}</p>
          <p><strong>Email :</strong> ${safe(data.customer.email)}</p>
          <p><strong>Address :</strong> ${safe(data.customer.address)}</p>
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
      <p>${formatMoney(data.totals.netAmount, data.currencyCode)}</p>
    </div>

    <section class="bottom">
      <div class="bank">
        <h4>Bank details</h4>
        <ul>${renderBankDetails(data.bankDetails)}</ul>
      </div>
      <div>
        <h4>SDC INFORMATION</h4>
        <div class="fiscal-grid">
          <p><strong>SDC ID:</strong></p><p>${fiscalValue(data.fiscal.sdcId)}</p>
          <p><strong>DATE:</strong></p><p>${fiscalValue(data.fiscal.date)}</p>
          <p><strong>TIME:</strong></p><p>${fiscalValue(data.fiscal.time)}</p>
          <p><strong>RECEIPT NUMBER:</strong></p><p>${fiscalValue(data.fiscal.receiptNumber)}</p>
          <p><strong>Internal Data:</strong></p><p>${fiscalValue(data.fiscal.internalData)}</p>
          <p><strong>SIGNATURE:</strong></p><p>${fiscalValue(data.fiscal.receiptSignature)}</p>
          <p><strong>CIS DATE:</strong></p><p>${fiscalValue(data.fiscal.cisDate)}</p>
        </div>
      </div>
      <div>
        <h4>SDC INFORMATION</h4>
        <div class="fiscal-grid">
          <p><strong>TOTAL TAX</strong></p><p>${fiscalValue(data.fiscal.totalTax !== null ? formatMoney(data.fiscal.totalTax, data.currencyCode) : null)}</p>
          <p><strong>TOTAL AMOUNT</strong></p><p>${fiscalValue(data.fiscal.totalAmount !== null ? formatMoney(data.fiscal.totalAmount, data.currencyCode) : null)}</p>
          <p><strong>ITEMS NUMBER</strong></p><p>${fiscalValue(data.fiscal.itemsNumber)}</p>
          <p><strong>MRC</strong></p><p>${fiscalValue(data.fiscal.mrc)}</p>
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;
}
