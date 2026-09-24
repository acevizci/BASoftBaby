-- CreateTable
CREATE TABLE "ReviewPhoto" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "yol" TEXT NOT NULL,
    "kucukYol" TEXT NOT NULL,
    "genislik" INTEGER NOT NULL DEFAULT 0,
    "yukseklik" INTEGER NOT NULL DEFAULT 0,
    "onayli" BOOLEAN NOT NULL DEFAULT false,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewPhoto_reviewId_idx" ON "ReviewPhoto"("reviewId");

-- CreateIndex
CREATE INDEX "ReviewPhoto_onayli_idx" ON "ReviewPhoto"("onayli");

-- AddForeignKey
ALTER TABLE "ReviewPhoto" ADD CONSTRAINT "ReviewPhoto_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

