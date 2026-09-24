-- CreateTable
CREATE TABLE "BundleItem" (
    "id" TEXT NOT NULL,
    "setVariantId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "adet" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BundleItem_variantId_idx" ON "BundleItem"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "BundleItem_setVariantId_variantId_key" ON "BundleItem"("setVariantId", "variantId");

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_setVariantId_fkey" FOREIGN KEY ("setVariantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleItem" ADD CONSTRAINT "BundleItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

