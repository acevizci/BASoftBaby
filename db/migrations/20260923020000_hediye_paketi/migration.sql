-- Hediye paketi ve hediye notu (K-98).
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "hediyeNotu" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "hediyePaketi" BOOLEAN NOT NULL DEFAULT false;

