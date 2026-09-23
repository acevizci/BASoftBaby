-- İade/değişim kargo gideri ve sayım farkının maliyeti (K-114).
-- AlterTable
ALTER TABLE "StockCountLine" ADD COLUMN     "alisFiyatKurus" INTEGER;

-- AlterTable
ALTER TABLE "StoreSetting" ADD COLUMN     "iadeKargoGiderKurus" INTEGER;

