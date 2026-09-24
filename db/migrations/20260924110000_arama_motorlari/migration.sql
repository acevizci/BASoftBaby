-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "bingDogrulama" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "googleDogrulama" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "indexNowAcik" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "indexNowAnahtari" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "yandexDogrulama" TEXT NOT NULL DEFAULT '';

