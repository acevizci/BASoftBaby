-- CreateTable
CREATE TABLE "LoginThrottle" (
    "id" TEXT NOT NULL,
    "sayac" INTEGER NOT NULL DEFAULT 0,
    "ilkDeneme" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "kilitBitis" TIMESTAMP(3),
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoginThrottle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LoginThrottle_guncellendi_idx" ON "LoginThrottle"("guncellendi");
