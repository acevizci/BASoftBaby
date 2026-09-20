-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "bannerSaniye" INTEGER NOT NULL DEFAULT 6;

-- CreateTable
CREATE TABLE "HeroBanner" (
    "id" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "altYazi" TEXT NOT NULL DEFAULT '',
    "dugmeYazi" TEXT NOT NULL DEFAULT '',
    "dugmeLink" TEXT NOT NULL DEFAULT '',
    "palet" TEXT NOT NULL DEFAULT 'sari',
    "gorsel" TEXT NOT NULL DEFAULT 'amblem',
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "baslangic" TIMESTAMP(3),
    "bitis" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeroBanner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HeroBanner_aktif_sira_idx" ON "HeroBanner"("aktif", "sira");
