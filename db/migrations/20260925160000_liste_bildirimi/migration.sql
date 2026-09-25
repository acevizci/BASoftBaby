-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "listeBildirildi" TIMESTAMP(3),
ADD COLUMN     "listeGonderen" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "listeNotu" TEXT NOT NULL DEFAULT '';

