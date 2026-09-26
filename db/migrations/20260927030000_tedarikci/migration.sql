-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "tedarikciId" TEXT,
ADD COLUMN     "tedarikciKodu" TEXT;

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "telefon" TEXT,
    "not" TEXT NOT NULL DEFAULT '',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierOrder" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT,
    "satirlar" JSONB NOT NULL,
    "metin" TEXT NOT NULL,
    "adminId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_ad_key" ON "Supplier"("ad");

-- CreateIndex
CREATE INDEX "SupplierOrder_olusturuldu_idx" ON "SupplierOrder"("olusturuldu");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tedarikciId_fkey" FOREIGN KEY ("tedarikciId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierOrder" ADD CONSTRAINT "SupplierOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

