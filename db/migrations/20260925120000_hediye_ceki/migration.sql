-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "giftCardId" TEXT,
ADD COLUMN     "hediyeCekiKurus" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "hediyeCekiKurus" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "GiftCard" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "tutarKurus" INTEGER NOT NULL,
    "bakiyeKurus" INTEGER NOT NULL,
    "aliciAd" TEXT NOT NULL DEFAULT '',
    "aliciEposta" TEXT NOT NULL DEFAULT '',
    "not" TEXT NOT NULL DEFAULT '',
    "sonKullanma" TIMESTAMP(3),
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "yapan" TEXT NOT NULL DEFAULT '',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftCardUse" (
    "id" TEXT NOT NULL,
    "giftCardId" TEXT NOT NULL,
    "siparisNo" TEXT,
    "tutarKurus" INTEGER NOT NULL,
    "sebep" TEXT NOT NULL,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftCardUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftCard_kod_key" ON "GiftCard"("kod");

-- CreateIndex
CREATE INDEX "GiftCard_olusturuldu_idx" ON "GiftCard"("olusturuldu");

-- CreateIndex
CREATE INDEX "GiftCardUse_giftCardId_idx" ON "GiftCardUse"("giftCardId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftCardUse" ADD CONSTRAINT "GiftCardUse_giftCardId_fkey" FOREIGN KEY ("giftCardId") REFERENCES "GiftCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

