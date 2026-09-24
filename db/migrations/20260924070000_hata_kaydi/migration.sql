-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "parmakIzi" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL,
    "mesaj" TEXT NOT NULL,
    "yigin" TEXT NOT NULL DEFAULT '',
    "adres" TEXT NOT NULL DEFAULT '',
    "ozet" TEXT NOT NULL DEFAULT '',
    "adet" INTEGER NOT NULL DEFAULT 1,
    "ilk" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "son" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cozuldu" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ErrorLog_parmakIzi_key" ON "ErrorLog"("parmakIzi");

-- CreateIndex
CREATE INDEX "ErrorLog_son_idx" ON "ErrorLog"("son");

