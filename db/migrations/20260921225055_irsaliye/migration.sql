-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "sonIrsaliyeNo" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Waybill" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "numara" TEXT NOT NULL,
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sevk" TIMESTAMP(3),
    "tasiyici" TEXT NOT NULL DEFAULT '',
    "takipNo" TEXT NOT NULL DEFAULT '',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Waybill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Waybill_orderId_key" ON "Waybill"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Waybill_numara_key" ON "Waybill"("numara");

-- AddForeignKey
ALTER TABLE "Waybill" ADD CONSTRAINT "Waybill_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
