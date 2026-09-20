-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "sozlesmeOnayi" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "destekEposta" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "destekTelefon" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "etbisNo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "mersisNo" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "sirketAdresi" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "unvan" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "vergiDairesi" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "vergiNo" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "LegalPage" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "baslik" TEXT NOT NULL,
    "ozet" TEXT NOT NULL DEFAULT '',
    "icerik" TEXT NOT NULL,
    "taslakMi" BOOLEAN NOT NULL DEFAULT true,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalPage_slug_key" ON "LegalPage"("slug");

-- CreateIndex
CREATE INDEX "LegalPage_sira_idx" ON "LegalPage"("sira");
