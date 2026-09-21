-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "teslimTarihi" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OrderRequest" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "sebep" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL DEFAULT '',
    "durum" TEXT NOT NULL DEFAULT 'yeni',
    "cevap" TEXT NOT NULL DEFAULT '',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderRequestItem" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "adet" INTEGER NOT NULL,

    CONSTRAINT "OrderRequestItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrderRequest_durum_olusturuldu_idx" ON "OrderRequest"("durum", "olusturuldu");

-- CreateIndex
CREATE INDEX "OrderRequest_orderId_idx" ON "OrderRequest"("orderId");

-- CreateIndex
CREATE INDEX "OrderRequestItem_requestId_idx" ON "OrderRequestItem"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderRequestItem_requestId_orderItemId_key" ON "OrderRequestItem"("requestId", "orderItemId");

-- AddForeignKey
ALTER TABLE "OrderRequest" ADD CONSTRAINT "OrderRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRequestItem" ADD CONSTRAINT "OrderRequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "OrderRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderRequestItem" ADD CONSTRAINT "OrderRequestItem_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
