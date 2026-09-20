-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "kdvOrani" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "sonFaturaNo" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "varsayilanTasiyici" TEXT NOT NULL DEFAULT 'yurtici';

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tasiyici" TEXT NOT NULL,
    "takipNo" TEXT NOT NULL,
    "barkod" TEXT NOT NULL,
    "saglayici" TEXT,
    "saglayiciRef" TEXT,
    "etiketAdresi" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'hazirlandi',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "numara" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kdvOrani" INTEGER NOT NULL,
    "matrahKurus" INTEGER NOT NULL,
    "kdvKurus" INTEGER NOT NULL,
    "toplamKurus" INTEGER NOT NULL,
    "saglayici" TEXT,
    "saglayiciRef" TEXT,
    "pdfAdresi" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'taslak',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_takipNo_idx" ON "Shipment"("takipNo");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_orderId_key" ON "Invoice"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_numara_key" ON "Invoice"("numara");

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
