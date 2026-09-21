-- CreateTable
CREATE TABLE "ProductImport" (
    "id" TEXT NOT NULL,
    "dosyaAdi" TEXT NOT NULL,
    "satirlar" JSONB NOT NULL,
    "hatalar" JSONB NOT NULL,
    "satirSayisi" INTEGER NOT NULL,
    "uygulandi" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImport_olusturuldu_idx" ON "ProductImport"("olusturuldu");
