-- Panel kullanıcısının e-postası davet bağlantısıyla doğrulanıyor (K-87).
ALTER TABLE "AdminUser" ADD COLUMN "epostaDogrulandi" TIMESTAMP(3);

-- Var olan hesaplar zaten kullanılıyor: doğrulanmış sayılıyorlar, yoksa
-- bu göçle herkes panelin dışında kalırdı.
UPDATE "AdminUser" SET "epostaDogrulandi" = "olusturuldu";
