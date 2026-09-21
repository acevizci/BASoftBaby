-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "eposta" TEXT NOT NULL,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockAlert_variantId_idx" ON "StockAlert"("variantId");

-- CreateIndex
CREATE INDEX "StockAlert_olusturuldu_idx" ON "StockAlert"("olusturuldu");

-- CreateIndex
CREATE UNIQUE INDEX "StockAlert_variantId_eposta_key" ON "StockAlert"("variantId", "eposta");

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
