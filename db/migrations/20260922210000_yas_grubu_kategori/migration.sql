-- Yaş grubu isteğe bağlı olarak bir kategoriye bağlanabiliyor (K-80).
-- AlterTable
ALTER TABLE "AgeGroup" ADD COLUMN     "categoryId" TEXT;

-- AddForeignKey
ALTER TABLE "AgeGroup" ADD CONSTRAINT "AgeGroup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

