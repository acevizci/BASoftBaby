-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "kategoriIdleri" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "urunIdleri" TEXT[] DEFAULT ARRAY[]::TEXT[];


-- Tekli kapsam listeye taşınıyor (K-171); tekli alan boşalıyor ki kategori
-- ya da ürün silinince kampanya da silinmesin (liste budanıyor).
UPDATE "Campaign" SET "kategoriIdleri" = ARRAY["categoryId"], "categoryId" = NULL, "guncellendi" = now()
 WHERE "categoryId" IS NOT NULL;
UPDATE "Campaign" SET "urunIdleri" = ARRAY["productId"], "productId" = NULL, "guncellendi" = now()
 WHERE "productId" IS NOT NULL;
