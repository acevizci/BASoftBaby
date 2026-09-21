-- CreateTable
CREATE TABLE "Size" (
    "id" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "boy" TEXT NOT NULL,
    "kilo" TEXT NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "yasKodu" TEXT,

    CONSTRAINT "Size_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Size_ad_key" ON "Size"("ad");

-- CreateIndex
CREATE INDEX "Size_aktif_sira_idx" ON "Size"("aktif", "sira");

-- Bedenler bugüne kadar kodda sabitti (ui/katalog-bicim.ts). Aynı altı beden
-- ve aynı ölçüler tabloya taşınıyor; böylece bu göçten sonra mağaza ve panel
-- hiçbir fark görmüyor, sadece artık düzenlenebiliyorlar.
-- `ON CONFLICT DO NOTHING`: göç yeniden çalışırsa çift kayıt olmasın.
INSERT INTO "Size" ("id", "ad", "boy", "kilo", "sira", "aktif", "yasKodu") VALUES
  ('beden_0_3',   '0-3 ay',   '56 - 62 cm', '3 - 6 kg',      1, true, '0-3'),
  ('beden_3_6',   '3-6 ay',   '62 - 68 cm', '6 - 8 kg',      2, true, '3-6'),
  ('beden_6_9',   '6-9 ay',   '68 - 74 cm', '8 - 9 kg',      3, true, '6-12'),
  ('beden_9_12',  '9-12 ay',  '74 - 80 cm', '9 - 10 kg',     4, true, '6-12'),
  ('beden_12_18', '12-18 ay', '80 - 86 cm', '10 - 11 kg',    5, true, '12-24'),
  ('beden_18_24', '18-24 ay', '86 - 92 cm', '11 - 12,5 kg',  6, true, '12-24')
ON CONFLICT ("ad") DO NOTHING;
