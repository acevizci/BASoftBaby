-- CreateTable
CREATE TABLE "AgeGroup" (
    "id" TEXT NOT NULL,
    "kod" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AgeGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AgeGroup_kod_key" ON "AgeGroup"("kod");

-- CreateIndex
CREATE INDEX "AgeGroup_aktif_sira_idx" ON "AgeGroup"("aktif", "sira");

-- Yaş grupları kodda sabitti (ui/katalog-bicim.ts, YAS_GRUPLARI). Bedenlerde
-- olduğu gibi (K-56) aynı dört grup aynı kodlarla tabloya taşınıyor: göçten
-- sonra mağaza ve panel hiçbir fark görmüyor, artık yalnızca düzenlenebiliyor.
-- Kodlar `Size.yasKodu` alanında metin olarak duruyor, o yüzden aynen kalmalı.
INSERT INTO "AgeGroup" ("id", "kod", "ad", "aciklama", "sira", "aktif") VALUES
  ('yas_0_3',   '0-3',   'Yenidoğan', '0-3 ay',   1, true),
  ('yas_3_6',   '3-6',   'Bebek',     '3-6 ay',   2, true),
  ('yas_6_12',  '6-12',  'Bebek',     '6-12 ay',  3, true),
  ('yas_12_24', '12-24', 'Yürüyen',   '12-24 ay', 4, true)
ON CONFLICT ("kod") DO NOTHING;
