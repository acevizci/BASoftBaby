-- AlterTable
ALTER TABLE "GiftList" ADD COLUMN     "adresId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "listeAdresi" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "teslimAlan" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "teslimTelefon" TEXT NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE "GiftList" ADD CONSTRAINT "GiftList_adresId_fkey" FOREIGN KEY ("adresId") REFERENCES "Address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

