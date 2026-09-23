-- Panel kullanıcılarına sabah özeti e-postası (K-101).
-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "sabahOzeti" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "sabahOzetiGonderildi" TIMESTAMP(3);
