-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "adSoyad" TEXT NOT NULL,
    "puan" INTEGER NOT NULL,
    "yorum" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'yayinda',
    "gizlemeSebebi" TEXT NOT NULL DEFAULT '',
    "yanit" TEXT NOT NULL DEFAULT '',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Review_orderItemId_key" ON "Review"("orderItemId");

-- CreateIndex
CREATE INDEX "Review_productId_durum_idx" ON "Review"("productId", "durum");

-- CreateIndex
CREATE INDEX "Review_durum_olusturuldu_idx" ON "Review"("durum", "olusturuldu");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tohum dosyası ürünlere uydurma puan ve yorum sayısı yazıyordu (4,8 · 126
-- değerlendirme gibi). Gerçek değerlendirme diye bir şey yoktu; bu sayılar
-- müşteriyi yanıltıyordu ve e-ticaret mevzuatına aykırıydı. Artık puan
-- yalnızca Review kayıtlarından hesaplanıyor, o yüzden hepsi sıfırlanıyor.
-- Hiç yorumu olmayan üründe puan satırı ekranda görünmüyor.
UPDATE "Product" SET "puan" = NULL, "yorumSayisi" = 0;
