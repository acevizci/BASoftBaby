-- Sabit giderler (K-115).
-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "ay" TEXT NOT NULL,
    "bitisAy" TEXT,
    "tekrarli" BOOLEAN NOT NULL DEFAULT false,
    "kategori" TEXT NOT NULL DEFAULT 'diger',
    "aciklama" TEXT NOT NULL DEFAULT '',
    "tutarKurus" INTEGER NOT NULL,
    "adminId" TEXT,
    "yapan" TEXT NOT NULL DEFAULT '',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Expense_ay_idx" ON "Expense"("ay");

