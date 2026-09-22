-- Banner yalnızca bir resim olabiliyor; telefon için ayrı resim isteğe bağlı (K-89).
-- AlterTable
ALTER TABLE "HeroBanner" ADD COLUMN     "resimGenislik" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "resimKucukYol" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "resimYol" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "resimYukseklik" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "telefonGenislik" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "telefonYol" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "telefonYukseklik" INTEGER NOT NULL DEFAULT 0;

