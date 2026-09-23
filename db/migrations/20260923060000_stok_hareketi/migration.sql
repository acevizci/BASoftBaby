-- Stok hareket geçmişi (K-103).
-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "variantId" TEXT,
    "productId" TEXT NOT NULL,
    "urunAd" TEXT NOT NULL,
    "beden" TEXT NOT NULL,
    "renk" TEXT NOT NULL,
    "degisim" INTEGER NOT NULL,
    "sonra" INTEGER NOT NULL,
    "sebep" TEXT NOT NULL,
    "siparisNo" TEXT,
    "adminId" TEXT,
    "yapan" TEXT NOT NULL DEFAULT '',
    "not" TEXT NOT NULL DEFAULT '',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockMovement_variantId_olusturuldu_idx" ON "StockMovement"("variantId", "olusturuldu");

-- CreateIndex
CREATE INDEX "StockMovement_productId_olusturuldu_idx" ON "StockMovement"("productId", "olusturuldu");

-- CreateIndex
CREATE INDEX "StockMovement_olusturuldu_idx" ON "StockMovement"("olusturuldu");

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

