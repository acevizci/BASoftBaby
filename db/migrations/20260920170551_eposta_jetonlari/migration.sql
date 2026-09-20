-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "epostaDogrulandi" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "CustomerToken" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "tur" TEXT NOT NULL,
    "biter" TIMESTAMP(3) NOT NULL,
    "kullanildi" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerToken_customerId_tur_idx" ON "CustomerToken"("customerId", "tur");

-- CreateIndex
CREATE INDEX "CustomerToken_biter_idx" ON "CustomerToken"("biter");

-- AddForeignKey
ALTER TABLE "CustomerToken" ADD CONSTRAINT "CustomerToken_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
