-- CreateTable
CREATE TABLE "VariantBarcode" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "carpan" INTEGER NOT NULL DEFAULT 1,
    "adminId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VariantBarcode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DepoIslemi" (
    "id" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "sonuc" JSONB NOT NULL,
    "adminId" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DepoIslemi_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VariantBarcode_kod_idx" ON "VariantBarcode"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "VariantBarcode_kod_variantId_key" ON "VariantBarcode"("kod", "variantId");

-- CreateIndex
CREATE INDEX "DepoIslemi_olusturuldu_idx" ON "DepoIslemi"("olusturuldu");

-- AddForeignKey
ALTER TABLE "VariantBarcode" ADD CONSTRAINT "VariantBarcode_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

