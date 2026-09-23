-- Kampanya indiriminin satıra düşen payı (K-109).
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "indirimKurus" INTEGER;

-- İndirimsiz eski siparişlerde pay kesin olarak sıfır; indirimli eski
-- siparişlerde hangi satırın kampanyaya girdiği bilinmediği için boş kalıyor.
UPDATE "OrderItem" AS i SET "indirimKurus" = 0
  FROM "Order" AS o
 WHERE o.id = i."orderId" AND o."indirimKurus" = 0;
