-- Favori bildirimi için son bakılan fiyat ve bedenler (K-100).
-- AlterTable
ALTER TABLE "Favorite" ADD COLUMN "bakilanFiyatKurus" INTEGER,
ADD COLUMN "stoktakiBedenler" TEXT[] DEFAULT ARRAY[]::TEXT[];
