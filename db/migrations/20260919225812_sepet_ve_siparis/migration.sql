-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "bedavaKargoEsigi" INTEGER NOT NULL DEFAULT 75000,
ADD COLUMN     "havaleBilgisi" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "kargoKurus" INTEGER NOT NULL DEFAULT 4990,
ADD COLUMN     "sonSiparisNo" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "adet" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "numara" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'bekliyor',
    "odemeYontemi" TEXT NOT NULL DEFAULT 'havale',
    "odemeDurumu" TEXT NOT NULL DEFAULT 'bekliyor',
    "adSoyad" TEXT NOT NULL,
    "eposta" TEXT NOT NULL,
    "telefon" TEXT NOT NULL,
    "adres" TEXT NOT NULL,
    "ilce" TEXT NOT NULL,
    "il" TEXT NOT NULL,
    "postaKodu" TEXT NOT NULL,
    "not" TEXT NOT NULL DEFAULT '',
    "araToplamKurus" INTEGER NOT NULL,
    "kargoKurus" INTEGER NOT NULL,
    "toplamKurus" INTEGER NOT NULL,
    "kargoTakipNo" TEXT,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "variantId" TEXT,
    "urunAd" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "beden" TEXT NOT NULL,
    "renk" TEXT NOT NULL,
    "adet" INTEGER NOT NULL,
    "fiyatKurus" INTEGER NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Cart_guncellendi_idx" ON "Cart"("guncellendi");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_variantId_key" ON "CartItem"("cartId", "variantId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_numara_key" ON "Order"("numara");

-- CreateIndex
CREATE INDEX "Order_durum_olusturuldu_idx" ON "Order"("durum", "olusturuldu");

-- CreateIndex
CREATE INDEX "Order_eposta_idx" ON "Order"("eposta");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
