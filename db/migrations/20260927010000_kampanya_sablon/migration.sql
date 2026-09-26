-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "sablon" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_sablon_key" ON "Campaign"("sablon");

