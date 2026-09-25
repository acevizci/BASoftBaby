-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "enFazlaKullanim" INTEGER;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "tesvikGonderildi" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "tesvikGecerlilik" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "tesvikGun" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "tesvikYuzde" INTEGER NOT NULL DEFAULT 0;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

