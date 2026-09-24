-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "ozet" TEXT NOT NULL DEFAULT '',
    "metin" TEXT NOT NULL DEFAULT '',
    "urunSluglari" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yayinda" BOOLEAN NOT NULL DEFAULT false,
    "yayinTarihi" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_yayinda_yayinTarihi_idx" ON "Article"("yayinda", "yayinTarihi");

