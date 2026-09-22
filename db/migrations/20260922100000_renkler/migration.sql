-- CreateTable
CREATE TABLE "Color" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "zemin" TEXT NOT NULL,
    "c1" TEXT NOT NULL,
    "c2" TEXT NOT NULL,
    "c3" TEXT NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Color_kod_key" ON "Color"("kod");

-- CreateIndex
CREATE INDEX "Color_aktif_sira_idx" ON "Color"("aktif", "sira");

-- Renkler kodda sabitti (ui/katalog-bicim.ts: RENK_ADLARI ve PALET). Aynı beş
-- renk, aynı kodlar ve aynı palet değerleriyle tabloya taşınıyor: göçten
-- sonra mağaza ve panel hiçbir fark görmüyor, artık yalnızca düzenlenebiliyor.
-- Kodlar `ProductVariant.renk`, `ProductImage.renk`, `Product.palet` ve
-- `Banner.palet` alanlarında metin olarak duruyor, o yüzden aynen kalmalı.
INSERT INTO "Color" ("id", "kod", "ad", "sira", "aktif", "zemin", "c1", "c2", "c3") VALUES
  ('renk_mint',   'mint',   'Nane',   1, true, '#E6F7EE', '#8FD9B7', '#B9E9D2', '#3FA478'),
  ('renk_krem',   'krem',   'Krem',   2, true, '#FBF3E4', '#EBD3A8', '#F7E7C9', '#B08A45'),
  ('renk_mercan', 'mercan', 'Mercan', 3, true, '#FDEBE9', '#F5A79E', '#FAC8C2', '#C2433A'),
  ('renk_mavi',   'mavi',   'Mavi',   4, true, '#EAF3FA', '#A9CCE6', '#CBE2F2', '#3F82B4'),
  ('renk_sari',   'sari',   'Sarı',   5, true, '#FDF3DD', '#F2CE85', '#F9E6BC', '#8F6410')
ON CONFLICT ("kod") DO NOTHING;
