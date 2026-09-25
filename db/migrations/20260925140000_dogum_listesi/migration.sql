-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "giftListItemId" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "giftListItemId" TEXT;

-- CreateTable
CREATE TABLE "GiftList" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "sahipAdi" TEXT NOT NULL,
    "tarih" TIMESTAMP(3),
    "mesaj" TEXT NOT NULL DEFAULT '',
    "acik" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GiftList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GiftListItem" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "istenen" INTEGER NOT NULL DEFAULT 1,
    "alinan" INTEGER NOT NULL DEFAULT 0,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GiftListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GiftList_kod_key" ON "GiftList"("kod");

-- CreateIndex
CREATE UNIQUE INDEX "GiftList_customerId_key" ON "GiftList"("customerId");

-- CreateIndex
CREATE INDEX "GiftListItem_variantId_idx" ON "GiftListItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "GiftListItem_listId_variantId_key" ON "GiftListItem"("listId", "variantId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_giftListItemId_fkey" FOREIGN KEY ("giftListItemId") REFERENCES "GiftListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_giftListItemId_fkey" FOREIGN KEY ("giftListItemId") REFERENCES "GiftListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftList" ADD CONSTRAINT "GiftList_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftListItem" ADD CONSTRAINT "GiftListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "GiftList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GiftListItem" ADD CONSTRAINT "GiftListItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

