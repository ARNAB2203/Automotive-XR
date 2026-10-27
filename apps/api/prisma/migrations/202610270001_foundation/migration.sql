-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PLATFORM_ADMIN', 'TENANT_ADMIN', 'DEALER_MANAGER', 'SALES_REPRESENTATIVE', 'CUSTOMER');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleModel" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "VehicleModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleVariant" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "VehicleVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleOption" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "swatch" TEXT,

    CONSTRAINT "VehicleOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptionCompatibilityRule" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "optionCode" TEXT NOT NULL,
    "excludesCode" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "OptionCompatibilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBook" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PriceBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBookEntry" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "priceBookId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "PriceBookEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleConfiguration" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "options" JSONB NOT NULL,
    "total" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehicleConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dealer" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "Dealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLead" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "dealerId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "consent" BOOLEAN NOT NULL,
    "preferredDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StreamingSession" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastHeartbeat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StreamingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "subject" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_subject_key" ON "User"("tenantId", "subject");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_id_key" ON "User"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_role_key" ON "UserRole"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_tenantId_slug_key" ON "VehicleModel"("tenantId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleModel_tenantId_id_key" ON "VehicleModel"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleVariant_tenantId_id_key" ON "VehicleVariant"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleOption_tenantId_vehicleId_code_key" ON "VehicleOption"("tenantId", "vehicleId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleOption_tenantId_id_key" ON "VehicleOption"("tenantId", "id");

-- CreateIndex
CREATE INDEX "OptionCompatibilityRule_tenantId_vehicleId_idx" ON "OptionCompatibilityRule"("tenantId", "vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceBook_tenantId_id_key" ON "PriceBook"("tenantId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "PriceBookEntry_tenantId_priceBookId_code_key" ON "PriceBookEntry"("tenantId", "priceBookId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleConfiguration_shareId_key" ON "VehicleConfiguration"("shareId");

-- CreateIndex
CREATE INDEX "VehicleConfiguration_tenantId_userId_idx" ON "VehicleConfiguration"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Dealer_tenantId_id_key" ON "Dealer"("tenantId", "id");

-- CreateIndex
CREATE INDEX "CustomerLead_tenantId_createdAt_idx" ON "CustomerLead"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "StreamingSession_tenantId_status_expiresAt_idx" ON "StreamingSession"("tenantId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "AuditEvent_tenantId_createdAt_idx" ON "AuditEvent"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleModel" ADD CONSTRAINT "VehicleModel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_tenantId_vehicleId_fkey" FOREIGN KEY ("tenantId", "vehicleId") REFERENCES "VehicleModel"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleOption" ADD CONSTRAINT "VehicleOption_tenantId_vehicleId_fkey" FOREIGN KEY ("tenantId", "vehicleId") REFERENCES "VehicleModel"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OptionCompatibilityRule" ADD CONSTRAINT "OptionCompatibilityRule_tenantId_vehicleId_fkey" FOREIGN KEY ("tenantId", "vehicleId") REFERENCES "VehicleModel"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBook" ADD CONSTRAINT "PriceBook_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBookEntry" ADD CONSTRAINT "PriceBookEntry_tenantId_priceBookId_fkey" FOREIGN KEY ("tenantId", "priceBookId") REFERENCES "PriceBook"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleConfiguration" ADD CONSTRAINT "VehicleConfiguration_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleConfiguration" ADD CONSTRAINT "VehicleConfiguration_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleConfiguration" ADD CONSTRAINT "VehicleConfiguration_tenantId_vehicleId_fkey" FOREIGN KEY ("tenantId", "vehicleId") REFERENCES "VehicleModel"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dealer" ADD CONSTRAINT "Dealer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLead" ADD CONSTRAINT "CustomerLead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLead" ADD CONSTRAINT "CustomerLead_tenantId_dealerId_fkey" FOREIGN KEY ("tenantId", "dealerId") REFERENCES "Dealer"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StreamingSession" ADD CONSTRAINT "StreamingSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
