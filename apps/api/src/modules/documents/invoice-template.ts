type InvoiceTemplateItem = {
  lineNo: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
};

type InvoiceTemplateData = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  currencyCode: string;
  customerName: string;
  customerTin: string;
  companyName: string;
  companyTin: string;
  companyAddress: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  rcptNo: string;
  verificationUrl: string | null;
  qrCodeData: string | null;
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

function formatMoney(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).format(value);
}

function maybeQrImage(qrCodeData: string | null): string {
  if (!qrCodeData) {
    return "";
  }

  if (qrCodeData.startsWith("data:image/")) {
    return `<img class="qr-image" src="${qrCodeData}" alt="Fiscal QR code" />`;
  }

  return `<div class="qr-fallback">${escapeHtml(qrCodeData)}</div>`;
}

export function buildInvoiceHtml(data: InvoiceTemplateData): string {
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td>${item.lineNo}</td>
        <td>${escapeHtml(item.itemName)}</td>
        <td class="num">${formatNumber(item.quantity)}</td>
        <td class="num">${formatMoney(item.unitPrice, data.currencyCode)}</td>
        <td class="num">${formatNumber(item.taxRate)}%</td>
        <td class="num">${formatMoney(item.taxAmount, data.currencyCode)}</td>
        <td class="num">${formatMoney(item.lineTotal, data.currencyCode)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Fiscal Invoice ${escapeHtml(data.invoiceNumber)}</title>
  <style>
    :root {
      --text: #1f2937;
      --muted: #6b7280;
      --line: #e5e7eb;
      --header: #111827;
    }

    @page {
      size: A4;
      margin: 16mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: var(--text);
      font-size: 12px;
      line-height: 1.45;
    }

    .container {
      width: 100%;
    }

    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid var(--header);
      padding-bottom: 10px;
      margin-bottom: 16px;
      gap: 12px;
    }

    .title {
      font-size: 20px;
      margin: 0;
      color: var(--header);
    }

    .label {
      color: var(--muted);
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.08em;
      margin: 0 0 2px;
    }

    .value {
      margin: 0 0 8px;
      font-weight: 500;
    }

    .section-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 14px;
    }

    .card {
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 10px;
      break-inside: avoid;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    th,
    td {
      border-bottom: 1px solid var(--line);
      padding: 8px 6px;
      text-align: left;
      vertical-align: top;
    }

    th {
      font-size: 10px;
      text-transform: uppercase;
      color: var(--muted);
      letter-spacing: 0.05em;
    }

    .num {
      text-align: right;
      white-space: nowrap;
    }

    .totals {
      margin-top: 14px;
      margin-left: auto;
      width: 300px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      border-bottom: 1px solid var(--line);
    }

    .totals-row.total {
      font-size: 14px;
      font-weight: 700;
      color: var(--header);
      border-bottom: 2px solid var(--header);
      padding-top: 8px;
      margin-top: 4px;
    }

    .footer {
      margin-top: 16px;
      border-top: 1px solid var(--line);
      padding-top: 12px;
      display: grid;
      grid-template-columns: 1fr 140px;
      gap: 12px;
      align-items: start;
    }

    .qr-image {
      width: 130px;
      height: 130px;
      object-fit: contain;
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 4px;
    }

    .qr-fallback {
      border: 1px solid var(--line);
      border-radius: 6px;
      padding: 8px;
      font-size: 10px;
      word-break: break-all;
      max-height: 130px;
      overflow: hidden;
    }

    @media print {
      .card, tr, td, th {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <main class="container">
    <header class="header">
      <div>
        <p class="label">Issuer</p>
        <h1 class="title">${escapeHtml(data.companyName)}</h1>
        <p class="value">TIN: ${escapeHtml(data.companyTin)}</p>
        <p class="value">${escapeHtml(data.companyAddress)}</p>
      </div>
      <div>
        <p class="label">Fiscal Receipt</p>
        <p class="value">Receipt No: ${escapeHtml(data.rcptNo)}</p>
        <p class="label">Invoice</p>
        <p class="value">${escapeHtml(data.invoiceNumber)}</p>
        <p class="label">Invoice ID</p>
        <p class="value">${escapeHtml(data.invoiceId)}</p>
      </div>
    </header>

    <section class="section-grid">
      <div class="card">
        <p class="label">Bill To</p>
        <p class="value">${escapeHtml(data.customerName)}</p>
        <p class="value">TIN: ${escapeHtml(data.customerTin)}</p>
      </div>
      <div class="card">
        <p class="label">Invoice Date</p>
        <p class="value">${escapeHtml(data.invoiceDate)}</p>
        <p class="label">Due Date</p>
        <p class="value">${escapeHtml(data.dueDate ?? "N/A")}</p>
      </div>
    </section>

    <table aria-label="Invoice items">
      <thead>
        <tr>
          <th>#</th>
          <th>Description</th>
          <th class="num">Qty</th>
          <th class="num">Unit Price</th>
          <th class="num">Tax Rate</th>
          <th class="num">Tax</th>
          <th class="num">Line Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <section class="totals">
      <div class="totals-row"><span>Subtotal</span><strong>${formatMoney(data.subtotalAmount, data.currencyCode)}</strong></div>
      <div class="totals-row"><span>Discount</span><strong>${formatMoney(data.discountAmount, data.currencyCode)}</strong></div>
      <div class="totals-row"><span>Tax</span><strong>${formatMoney(data.taxAmount, data.currencyCode)}</strong></div>
      <div class="totals-row total"><span>Total</span><strong>${formatMoney(data.totalAmount, data.currencyCode)}</strong></div>
    </section>

    <footer class="footer">
      <div>
        <p class="label">Verification</p>
        <p class="value">${escapeHtml(data.verificationUrl ?? "Not provided")}</p>
      </div>
      <div>
        ${maybeQrImage(data.qrCodeData)}
      </div>
    </footer>
  </main>
</body>
</html>`;
}
