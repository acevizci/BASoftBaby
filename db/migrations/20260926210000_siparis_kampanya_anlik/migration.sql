-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "kampanyaAlAdet" INTEGER,
ADD COLUMN     "kampanyaOdeAdet" INTEGER;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "kampanyada" BOOLEAN NOT NULL DEFAULT false;

