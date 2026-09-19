-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "aciklama" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "ad" TEXT NOT NULL,
    "ozet" TEXT NOT NULL,
    "aciklama" TEXT,
    "categoryId" TEXT NOT NULL,
    "fiyatKurus" INTEGER NOT NULL,
    "eskiFiyatKurus" INTEGER,
    "kumasIcerigi" TEXT NOT NULL,
    "yikamaTalimati" TEXT NOT NULL,
    "ureticiBilgisi" TEXT,
    "puan" DECIMAL(2,1),
    "yorumSayisi" INTEGER NOT NULL DEFAULT 0,
    "ozellikler" TEXT[],
    "rozetTon" TEXT,
    "rozetYazi" TEXT,
    "gorsel" TEXT NOT NULL DEFAULT 'zibin',
    "palet" TEXT NOT NULL DEFAULT 'mint',
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guncellendi" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductVariant" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "beden" TEXT NOT NULL,
    "renk" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "stok" INTEGER NOT NULL DEFAULT 0,
    "fiyatKurus" INTEGER,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "yol" TEXT NOT NULL,
    "altMetin" TEXT NOT NULL,
    "sira" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "metin" TEXT NOT NULL,
    "link" TEXT,
    "sira" INTEGER NOT NULL DEFAULT 0,
    "aktif" BOOLEAN NOT NULL DEFAULT true,
    "baslangic" TIMESTAMP(3),
    "bitis" TIMESTAMP(3),
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreSetting" (
    "id" TEXT NOT NULL DEFAULT 'tek',
    "seritAcik" BOOLEAN NOT NULL DEFAULT true,
    "seritHiz" TEXT NOT NULL DEFAULT 'orta',
    "seritRenk" TEXT NOT NULL DEFAULT 'nane',
    "seritDurdurHover" BOOLEAN NOT NULL DEFAULT true,
    "seritMobilde" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "StoreSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_aktif_sira_idx" ON "Category"("aktif", "sira");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_aktif_idx" ON "Product"("categoryId", "aktif");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_sku_key" ON "ProductVariant"("sku");

-- CreateIndex
CREATE INDEX "ProductVariant_productId_idx" ON "ProductVariant"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_productId_beden_renk_key" ON "ProductVariant"("productId", "beden", "renk");

-- CreateIndex
CREATE INDEX "ProductImage_productId_sira_idx" ON "ProductImage"("productId", "sira");

-- CreateIndex
CREATE INDEX "Announcement_aktif_sira_idx" ON "Announcement"("aktif", "sira");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
