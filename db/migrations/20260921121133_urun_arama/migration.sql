-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "aramaMetni" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "Product_aramaMetni_idx" ON "Product"("aramaMetni");

-- Var olan ürünlerin arama metni doldurulur. Normalleştirme kodla aynı:
-- Türkçe harfler ASCII karşılığına, küçük harf, harf-rakam dışı her şey
-- boşluk (bkz. server/arama.ts).
UPDATE "Product" SET "aramaMetni" = trim(regexp_replace(
  lower(translate(
    ad || ' ' || ozet || ' ' || coalesce(aciklama, '') || ' ' ||
    array_to_string(ozellikler, ' ') || ' ' || "kumasIcerigi",
    'çÇğĞıİIöÖşŞüÜâÂîÎûÛ',
    'ccggiiioossuuaaiiuu'
  )),
  '[^a-z0-9]+', ' ', 'g'));
