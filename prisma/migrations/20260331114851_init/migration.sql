-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'OPERATOR', 'AUDITOR');

-- CreateEnum
CREATE TYPE "SqlAuthType" AS ENUM ('SQL_AUTH', 'WINDOWS_AUTH');

-- CreateEnum
CREATE TYPE "InvoiceImportStatus" AS ENUM ('PENDING', 'IMPORTED', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FiscalStatus" AS ENUM ('NOT_SUBMITTED', 'QUEUED', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "PdfStatus" AS ENUM ('NOT_REQUESTED', 'PENDING', 'GENERATED', 'FAILED');

-- CreateEnum
CREATE TYPE "QrStatus" AS ENUM ('NOT_AVAILABLE', 'PENDING', 'GENERATED', 'FAILED');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('SALE', 'CREDIT_NOTE', 'DEBIT_NOTE', 'CANCELLATION', 'RETRY');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SENT', 'SUCCESS', 'FAILED', 'TIMEOUT');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('FISCAL_RECEIPT', 'INVOICE_PDF', 'QR_IMAGE', 'CANCELLATION_NOTE', 'OTHER');

-- CreateEnum
CREATE TYPE "GenerationStatus" AS ENUM ('PENDING', 'PROCESSING', 'GENERATED', 'FAILED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "LogSource" AS ENUM ('IMPORTER', 'FISCAL_API', 'DOCUMENT_ENGINE', 'QR_ENGINE', 'SYNC', 'SYSTEM');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('ITEM_CODES', 'TAX_CODES', 'BRANCHES', 'CUSTOMERS', 'SETTINGS');

-- CreateEnum
CREATE TYPE "QueueJobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "sqlServerHost" TEXT NOT NULL,
    "sqlServerInstance" TEXT,
    "sqlServerPort" INTEGER NOT NULL DEFAULT 1433,
    "sqlDatabaseName" TEXT NOT NULL,
    "sqlUsername" TEXT NOT NULL,
    "sqlPasswordEncrypted" TEXT NOT NULL,
    "sqlAuthType" "SqlAuthType" NOT NULL DEFAULT 'SQL_AUTH',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERATOR',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SageInvoice" (
    "id" TEXT NOT NULL,
    "sagePiece" TEXT NOT NULL,
    "sageDocType" TEXT NOT NULL,
    "sageDocumentNo" TEXT,
    "customerCode" TEXT,
    "customerName" TEXT,
    "customerTin" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'RWF',
    "exchangeRate" DECIMAL(18,6) NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "subtotalAmount" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "importStatus" "InvoiceImportStatus" NOT NULL DEFAULT 'PENDING',
    "fiscalStatus" "FiscalStatus" NOT NULL DEFAULT 'NOT_SUBMITTED',
    "pdfStatus" "PdfStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
    "qrStatus" "QrStatus" NOT NULL DEFAULT 'NOT_AVAILABLE',
    "sourceUpdatedAt" TIMESTAMP(3),
    "importedAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SageInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SageInvoiceItem" (
    "id" TEXT NOT NULL,
    "sageInvoiceId" TEXT NOT NULL,
    "lineNo" INTEGER NOT NULL,
    "itemCode" TEXT,
    "itemName" TEXT NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "unitPrice" DECIMAL(18,2) NOT NULL,
    "discountAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(18,2) NOT NULL,
    "unitOfMeasure" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SageInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalSubmission" (
    "id" TEXT NOT NULL,
    "sageInvoiceId" TEXT NOT NULL,
    "submissionType" "SubmissionType" NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "idempotencyKey" TEXT,
    "requestPayload" JSONB NOT NULL,
    "responsePayload" JSONB,
    "externalRequestId" TEXT,
    "submittedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalResult" (
    "id" TEXT NOT NULL,
    "sageInvoiceId" TEXT NOT NULL,
    "rcptNo" TEXT NOT NULL,
    "intrlData" TEXT,
    "rcptSign" TEXT NOT NULL,
    "verificationUrl" TEXT,
    "sdcId" TEXT,
    "mrcNo" TEXT,
    "qrCodeData" TEXT,
    "fiscalDay" TEXT,
    "taxAmount" DECIMAL(18,2),
    "totalAmount" DECIMAL(18,2),
    "resultPayload" JSONB,
    "receivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiscalResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedDocument" (
    "id" TEXT NOT NULL,
    "sageInvoiceId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sha256" TEXT,
    "fileSizeBytes" BIGINT,
    "generatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicLink" (
    "id" TEXT NOT NULL,
    "sageInvoiceId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "targetUrl" TEXT NOT NULL,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "expiresAt" TIMESTAMP(3),
    "lastAccessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "sageInvoiceId" TEXT,
    "syncType" "SyncType",
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "source" "LogSource" NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CodeSyncState" (
    "id" TEXT NOT NULL,
    "syncType" "SyncType" NOT NULL,
    "cursor" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,
    "isRunning" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodeSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RraCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "taxRate" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RraCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemMapping" (
    "id" TEXT NOT NULL,
    "sageItemCode" TEXT NOT NULL,
    "sageItemName" TEXT,
    "rraCodeId" TEXT NOT NULL,
    "confidenceScore" DECIMAL(5,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QueueJob" (
    "id" TEXT NOT NULL,
    "queueName" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" "QueueJobStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QueueJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceInitialization" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "branchCode" TEXT,
    "initializedAt" TIMESTAMP(3),
    "certificatePem" TEXT,
    "privateKeyEncrypted" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceInitialization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_isActive_idx" ON "Setting"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_isActive_idx" ON "User"("role", "isActive");

-- CreateIndex
CREATE INDEX "SageInvoice_invoiceDate_idx" ON "SageInvoice"("invoiceDate");

-- CreateIndex
CREATE INDEX "SageInvoice_importStatus_idx" ON "SageInvoice"("importStatus");

-- CreateIndex
CREATE INDEX "SageInvoice_fiscalStatus_idx" ON "SageInvoice"("fiscalStatus");

-- CreateIndex
CREATE INDEX "SageInvoice_pdfStatus_qrStatus_idx" ON "SageInvoice"("pdfStatus", "qrStatus");

-- CreateIndex
CREATE INDEX "SageInvoice_customerCode_idx" ON "SageInvoice"("customerCode");

-- CreateIndex
CREATE UNIQUE INDEX "SageInvoice_sagePiece_sageDocType_key" ON "SageInvoice"("sagePiece", "sageDocType");

-- CreateIndex
CREATE INDEX "SageInvoiceItem_itemCode_idx" ON "SageInvoiceItem"("itemCode");

-- CreateIndex
CREATE UNIQUE INDEX "SageInvoiceItem_sageInvoiceId_lineNo_key" ON "SageInvoiceItem"("sageInvoiceId", "lineNo");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalSubmission_idempotencyKey_key" ON "FiscalSubmission"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FiscalSubmission_sageInvoiceId_status_idx" ON "FiscalSubmission"("sageInvoiceId", "status");

-- CreateIndex
CREATE INDEX "FiscalSubmission_submissionType_idx" ON "FiscalSubmission"("submissionType");

-- CreateIndex
CREATE INDEX "FiscalSubmission_createdAt_idx" ON "FiscalSubmission"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FiscalResult_sageInvoiceId_key" ON "FiscalResult"("sageInvoiceId");

-- CreateIndex
CREATE INDEX "FiscalResult_rcptNo_idx" ON "FiscalResult"("rcptNo");

-- CreateIndex
CREATE INDEX "FiscalResult_receivedAt_idx" ON "FiscalResult"("receivedAt");

-- CreateIndex
CREATE INDEX "GeneratedDocument_sageInvoiceId_type_idx" ON "GeneratedDocument"("sageInvoiceId", "type");

-- CreateIndex
CREATE INDEX "GeneratedDocument_status_idx" ON "GeneratedDocument"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PublicLink_token_key" ON "PublicLink"("token");

-- CreateIndex
CREATE INDEX "PublicLink_sageInvoiceId_idx" ON "PublicLink"("sageInvoiceId");

-- CreateIndex
CREATE INDEX "PublicLink_expiresAt_idx" ON "PublicLink"("expiresAt");

-- CreateIndex
CREATE INDEX "SyncLog_sageInvoiceId_idx" ON "SyncLog"("sageInvoiceId");

-- CreateIndex
CREATE INDEX "SyncLog_syncType_createdAt_idx" ON "SyncLog"("syncType", "createdAt");

-- CreateIndex
CREATE INDEX "SyncLog_level_createdAt_idx" ON "SyncLog"("level", "createdAt");

-- CreateIndex
CREATE INDEX "SyncLog_source_createdAt_idx" ON "SyncLog"("source", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CodeSyncState_syncType_key" ON "CodeSyncState"("syncType");

-- CreateIndex
CREATE INDEX "CodeSyncState_isRunning_idx" ON "CodeSyncState"("isRunning");

-- CreateIndex
CREATE UNIQUE INDEX "RraCode_code_key" ON "RraCode"("code");

-- CreateIndex
CREATE INDEX "RraCode_category_idx" ON "RraCode"("category");

-- CreateIndex
CREATE INDEX "RraCode_isActive_idx" ON "RraCode"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ItemMapping_sageItemCode_key" ON "ItemMapping"("sageItemCode");

-- CreateIndex
CREATE INDEX "ItemMapping_rraCodeId_idx" ON "ItemMapping"("rraCodeId");

-- CreateIndex
CREATE INDEX "ItemMapping_isActive_idx" ON "ItemMapping"("isActive");

-- CreateIndex
CREATE INDEX "QueueJob_queueName_status_runAt_idx" ON "QueueJob"("queueName", "status", "runAt");

-- CreateIndex
CREATE INDEX "QueueJob_status_runAt_idx" ON "QueueJob"("status", "runAt");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceInitialization_deviceId_key" ON "DeviceInitialization"("deviceId");

-- CreateIndex
CREATE INDEX "DeviceInitialization_status_idx" ON "DeviceInitialization"("status");

-- AddForeignKey
ALTER TABLE "SageInvoiceItem" ADD CONSTRAINT "SageInvoiceItem_sageInvoiceId_fkey" FOREIGN KEY ("sageInvoiceId") REFERENCES "SageInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalSubmission" ADD CONSTRAINT "FiscalSubmission_sageInvoiceId_fkey" FOREIGN KEY ("sageInvoiceId") REFERENCES "SageInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiscalResult" ADD CONSTRAINT "FiscalResult_sageInvoiceId_fkey" FOREIGN KEY ("sageInvoiceId") REFERENCES "SageInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeneratedDocument" ADD CONSTRAINT "GeneratedDocument_sageInvoiceId_fkey" FOREIGN KEY ("sageInvoiceId") REFERENCES "SageInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicLink" ADD CONSTRAINT "PublicLink_sageInvoiceId_fkey" FOREIGN KEY ("sageInvoiceId") REFERENCES "SageInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_sageInvoiceId_fkey" FOREIGN KEY ("sageInvoiceId") REFERENCES "SageInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemMapping" ADD CONSTRAINT "ItemMapping_rraCodeId_fkey" FOREIGN KEY ("rraCodeId") REFERENCES "RraCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
