-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "enFazlaIndirimKurus" INTEGER,
ADD COLUMN     "ilkSiparis" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kademeler" JSONB,
ADD COLUMN     "kisiBasiSinir" INTEGER,
ADD COLUMN     "uyelereOzel" BOOLEAN NOT NULL DEFAULT false;

