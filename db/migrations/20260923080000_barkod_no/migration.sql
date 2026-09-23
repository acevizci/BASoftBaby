-- Etiket barkodu için kısa numara (K-107). Var olan bedenlere de SERIAL sırayla numara veriyor.
-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "barkodNo" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_barkodNo_key" ON "ProductVariant"("barkodNo");

