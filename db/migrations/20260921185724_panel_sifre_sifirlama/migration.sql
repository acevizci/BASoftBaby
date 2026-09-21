-- CreateTable
CREATE TABLE "AdminToken" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "biter" TIMESTAMP(3) NOT NULL,
    "kullanildi" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminToken_adminId_idx" ON "AdminToken"("adminId");

-- CreateIndex
CREATE INDEX "AdminToken_biter_idx" ON "AdminToken"("biter");

-- AddForeignKey
ALTER TABLE "AdminToken" ADD CONSTRAINT "AdminToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "AdminUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;
