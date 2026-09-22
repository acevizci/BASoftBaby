-- Panel kullanıcılarında rol ayrımı kaldırıldı (K-79): herkes her şeyi
-- yapabiliyor.
ALTER TABLE "AdminUser" DROP COLUMN "rol";
