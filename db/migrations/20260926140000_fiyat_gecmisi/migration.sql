-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fiyatKurus" INTEGER NOT NULL,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PriceHistory_productId_olusturuldu_idx" ON "PriceHistory"("productId", "olusturuldu");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Başlangıç kaydı (K-164): bugünkü liste fiyatı, ürünün son değiştiği andan
-- beri geçerli sayılıyor. Daha eskisi bilinmiyor; fiyat en geç o an girildi.
INSERT INTO "PriceHistory" ("id", "productId", "fiyatKurus", "olusturuldu")
SELECT 'fg' || replace(gen_random_uuid()::text, '-', ''), "id", "fiyatKurus", "guncellendi"
  FROM "Product";
