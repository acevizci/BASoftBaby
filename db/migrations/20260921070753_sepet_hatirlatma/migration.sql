-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "hatirlatildi" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "pazarlamaIzni" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pazarlamaIzniTarihi" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Cart_customerId_idx" ON "Cart"("customerId");

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
