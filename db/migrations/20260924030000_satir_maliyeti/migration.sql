-- Sipariş anındaki maliyet (K-111).
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "alisFiyatKurus" INTEGER,
ADD COLUMN     "alisTahmini" BOOLEAN NOT NULL DEFAULT false;

-- Eski siparişler bugünkü alış fiyatıyla dolduruluyor ve tahmini diye
-- işaretleniyor: sipariş anındaki maliyet bilinmiyor.
UPDATE "OrderItem" AS i
   SET "alisFiyatKurus" = p."alisFiyatKurus", "alisTahmini" = true
  FROM "ProductVariant" AS v
  JOIN "Product" AS p ON p.id = v."productId"
 WHERE v.id = i."variantId" AND p."alisFiyatKurus" IS NOT NULL;
