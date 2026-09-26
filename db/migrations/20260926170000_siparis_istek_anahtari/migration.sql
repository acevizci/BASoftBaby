-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "istekAnahtari" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Order_istekAnahtari_key" ON "Order"("istekAnahtari");

