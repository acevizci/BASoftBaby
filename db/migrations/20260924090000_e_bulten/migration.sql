-- CreateTable
CREATE TABLE "ConsentEvent" (
    "id" TEXT NOT NULL,
    "eposta" TEXT NOT NULL,
    "durum" TEXT NOT NULL,
    "kaynak" TEXT NOT NULL DEFAULT 'HS_WEB',
    "tarih" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iysBildirildi" TIMESTAMP(3),

    CONSTRAINT "ConsentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Newsletter" (
    "id" TEXT NOT NULL,
    "konu" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "durum" TEXT NOT NULL DEFAULT 'gonderiliyor',
    "alici" INTEGER NOT NULL DEFAULT 0,
    "gonderilen" INTEGER NOT NULL DEFAULT 0,
    "yapan" TEXT NOT NULL DEFAULT '',
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bitti" TIMESTAMP(3),

    CONSTRAINT "Newsletter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConsentEvent_iysBildirildi_idx" ON "ConsentEvent"("iysBildirildi");

-- CreateIndex
CREATE INDEX "ConsentEvent_eposta_idx" ON "ConsentEvent"("eposta");

-- CreateIndex
CREATE INDEX "Newsletter_olusturuldu_idx" ON "Newsletter"("olusturuldu");


-- Bugüne kadar verilmiş izinler de İYS'ye bildirilecek: her izinli müşteri
-- için izin tarihiyle bir ONAY kaydı (K-125).
INSERT INTO "ConsentEvent" ("id", "eposta", "durum", "tarih")
SELECT 'gecis_' || "id", "eposta", 'ONAY', COALESCE("pazarlamaIzniTarihi", CURRENT_TIMESTAMP)
FROM "Customer"
WHERE "pazarlamaIzni" = true;
