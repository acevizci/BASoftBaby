-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "saglayici" TEXT NOT NULL DEFAULT 'iyzico',
    "jeton" TEXT NOT NULL,
    "saglayiciRef" TEXT,
    "durum" TEXT NOT NULL DEFAULT 'baslatildi',
    "tutarKurus" INTEGER NOT NULL,
    "taksit" INTEGER NOT NULL DEFAULT 1,
    "hata" TEXT,
    "hamYanit" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_jeton_key" ON "Payment"("jeton");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE INDEX "Payment_durum_olusturuldu_idx" ON "Payment"("durum", "olusturuldu");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
