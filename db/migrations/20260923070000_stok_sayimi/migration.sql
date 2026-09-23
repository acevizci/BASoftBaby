-- Stok sayımı (K-107).
-- CreateTable
CREATE TABLE "StockCount" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "kapsam" TEXT NOT NULL DEFAULT '',
    "durum" TEXT NOT NULL DEFAULT 'acik',
    "adminId" TEXT,
    "yapan" TEXT NOT NULL DEFAULT '',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitti" TIMESTAMP(3),

    CONSTRAINT "StockCount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockCountLine" (
    "id" TEXT NOT NULL,
    "countId" TEXT NOT NULL,
    "variantId" TEXT,
    "productId" TEXT NOT NULL,
    "urunAd" TEXT NOT NULL,
    "beden" TEXT NOT NULL,
    "renk" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "fiyatKurus" INTEGER NOT NULL,
    "sayilan" INTEGER,
    "sistem" INTEGER,
    "ayrilan" INTEGER,
    "sayildi" TIMESTAMP(3),
    "uygulanan" INTEGER,

    CONSTRAINT "StockCountLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockCount_durum_olusturuldu_idx" ON "StockCount"("durum", "olusturuldu");

-- CreateIndex
CREATE INDEX "StockCountLine_countId_idx" ON "StockCountLine"("countId");

-- CreateIndex
CREATE INDEX "StockCountLine_variantId_idx" ON "StockCountLine"("variantId");

-- AddForeignKey
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_countId_fkey" FOREIGN KEY ("countId") REFERENCES "StockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockCountLine" ADD CONSTRAINT "StockCountLine_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

