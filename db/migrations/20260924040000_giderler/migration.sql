-- Kâr hesabının giderleri (K-112).
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "komisyonKurus" INTEGER;

-- AlterTable
ALTER TABLE "Shipment" ADD COLUMN     "ucretKurus" INTEGER;

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "hediyePaketGiderKurus" INTEGER,
ADD COLUMN     "kargoGiderKurus" INTEGER,
ADD COLUMN     "kartKomisyonOnbinde" INTEGER,
ADD COLUMN     "kartKomisyonSabitKurus" INTEGER,
ADD COLUMN     "paketGiderKurus" INTEGER;

