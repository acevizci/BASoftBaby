-- CreateTable
CREATE TABLE "ProductRedirect" (
    "slug" TEXT NOT NULL,
    "hedef" TEXT NOT NULL,
    "olusturuldu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductRedirect_pkey" PRIMARY KEY ("slug")
);

