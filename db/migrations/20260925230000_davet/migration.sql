-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "davetEdenId" TEXT,
ADD COLUMN     "davetKodu" TEXT,
ADD COLUMN     "davetOdulKodu" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "davetSonuclandi" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "davetEnFazla" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "davetOdulKurus" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "davetYuzde" INTEGER NOT NULL DEFAULT 10;

-- CreateIndex
CREATE UNIQUE INDEX "Customer_davetKodu_key" ON "Customer"("davetKodu");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_davetEdenId_fkey" FOREIGN KEY ("davetEdenId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

