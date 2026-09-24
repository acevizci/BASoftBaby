-- CreateTable
CREATE TABLE "ProductQuestion" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "soru" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL DEFAULT '',
    "eposta" TEXT NOT NULL DEFAULT '',
    "cevap" TEXT NOT NULL DEFAULT '',
    "durum" TEXT NOT NULL DEFAULT 'bekliyor',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cevaplandi" TIMESTAMP(3),

    CONSTRAINT "ProductQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductQuestion_productId_durum_idx" ON "ProductQuestion"("productId", "durum");

-- CreateIndex
CREATE INDEX "ProductQuestion_durum_olusturuldu_idx" ON "ProductQuestion"("durum", "olusturuldu");

-- AddForeignKey
ALTER TABLE "ProductQuestion" ADD CONSTRAINT "ProductQuestion_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

