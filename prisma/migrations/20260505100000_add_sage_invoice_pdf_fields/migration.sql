ALTER TABLE "SageInvoice"
ADD COLUMN "customerReference" TEXT,
ADD COLUMN "customerPhone" TEXT,
ADD COLUMN "customerEmail" TEXT,
ADD COLUMN "customerAddress" TEXT,
ADD COLUMN "sellerName" TEXT,
ADD COLUMN "sellerTin" TEXT,
ADD COLUMN "sellerPhone" TEXT,
ADD COLUMN "sellerEmail" TEXT,
ADD COLUMN "sellerAddress" TEXT,
ADD COLUMN "sellerWebsite" TEXT,
ADD COLUMN "paymentMode" TEXT,
ADD COLUMN "paymentAmount" DECIMAL(18,2),
ADD COLUMN "doneBy" TEXT,
ADD COLUMN "invoiceTime" TEXT,
ADD COLUMN "invoiceReference" TEXT,
ADD COLUMN "sageStatus" TEXT,
ADD COLUMN "bankDetails" TEXT;

ALTER TABLE "SageInvoiceItem"
ADD COLUMN "sourceLineReference" TEXT,
ADD COLUMN "taxIncludedTotal" DECIMAL(18,2),
ADD COLUMN "taxLabel" TEXT,
ADD COLUMN "batchNumber" TEXT,
ADD COLUMN "expiryDate" TIMESTAMP(3);
