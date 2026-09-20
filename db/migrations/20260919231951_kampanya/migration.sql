-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "indirimKurus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "kampanyaAdi" TEXT;

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "tip" TEXT NOT NULL DEFAULT 'yuzde',
    "deger" INTEGER NOT NULL,
    "kapsam" TEXT NOT NULL DEFAULT 'tumu',
    "categoryId" TEXT,
    "productId" TEXT,
    "kuponKodu" TEXT,
    "enAzSepetKurus" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "baslangic" TIMESTAMP(3),
    "bitis" TIMESTAMP(3),
    "kullanim" INTEGER NOT NULL DEFAULT 0,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_kuponKodu_key" ON "Campaign"("kuponKodu");

-- CreateIndex
CREATE INDEX "Campaign_aktif_baslangic_bitis_idx" ON "Campaign"("aktif", "baslangic", "bitis");

-- CreateIndex
CREATE INDEX "Campaign_categoryId_idx" ON "Campaign"("categoryId");

-- CreateIndex
CREATE INDEX "Campaign_productId_idx" ON "Campaign"("productId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
